import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import dotenv from 'dotenv';
import Redis from '../../backend/node_modules/ioredis/built/Redis.js';

// 加载测试环境变量
dotenv.config({ path: '.env.test' });

const shouldInitializeEnv = process.env.SKIP_TEST_ENV_SETUP !== 'true';
process.env.OUTBOX_PROCESSOR_ENABLED = 'false';
process.env.WORKFLOW_ENGINE_ENABLED = 'false';

// ============================================
// 全局测试设置
// ============================================

let dataSource: any | null = null;
let redisClient: Redis;

// 测试前初始化
beforeAll(async () => {
  if (!shouldInitializeEnv) {
    console.log('⚠️ SKIP_TEST_ENV_SETUP=true - bypassing test environment initialization');
    return;
  }

  console.log('🔧 Initializing test environment...');

  // 初始化数据库连接
  try {
    const { ConversationEntity } = await import('../../backend/src/infrastructure/database/entities/ConversationEntity.js');
    const { MessageEntity } = await import('../../backend/src/infrastructure/database/entities/MessageEntity.js');
    const { CustomerProfileEntity } = await import('../../backend/src/infrastructure/database/entities/CustomerProfileEntity.js');
    const { RequirementEntity } = await import('../../backend/src/infrastructure/database/entities/RequirementEntity.js');
    const { TaskEntity } = await import('../../backend/src/infrastructure/database/entities/TaskEntity.js');
    const { KnowledgeItemEntity } = await import('../../backend/src/infrastructure/database/entities/KnowledgeItemEntity.js');
    const { DomainEventEntity } = await import('../../backend/src/infrastructure/database/entities/DomainEventEntity.js');
    const { OutboxEventEntity } = await import('../../backend/src/infrastructure/database/entities/OutboxEventEntity.js');
    const { ReviewRequestEntity } = await import('../../backend/src/infrastructure/database/entities/ReviewRequestEntity.js');
    const { ProblemEntity } = await import('../../backend/src/infrastructure/database/entities/ProblemEntity.js');
    const { QualityReportEntity } = await import('../../backend/src/infrastructure/database/entities/QualityReportEntity.js');
    const { SurveyEntity } = await import('../../backend/src/infrastructure/database/entities/SurveyEntity.js');
    const { AuditEventEntity } = await import('../../backend/src/infrastructure/database/entities/AuditEventEntity.js');
    const { MonitoringAlertEntity } = await import('../../backend/src/infrastructure/database/entities/MonitoringAlertEntity.js');
    const { RoleEntity } = await import('../../backend/src/infrastructure/database/entities/RoleEntity.js');
    const { UserEntity } = await import('../../backend/src/infrastructure/database/entities/UserEntity.js');

    const { DataSource } = await import('../../backend/node_modules/typeorm/index.js');
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
      username: process.env.TEST_DB_USER || 'admin',
      password: process.env.TEST_DB_PASSWORD || 'admin123',
      database: process.env.TEST_DB_NAME || 'aftersales_test',
      entities: [
        ConversationEntity,
        MessageEntity,
        CustomerProfileEntity,
        RequirementEntity,
        TaskEntity,
        KnowledgeItemEntity,
        DomainEventEntity,
        OutboxEventEntity,
        ReviewRequestEntity,
        ProblemEntity,
        QualityReportEntity,
        SurveyEntity,
        AuditEventEntity,
        MonitoringAlertEntity,
        RoleEntity,
        UserEntity,
      ],
      synchronize: true,
      logging: false,
      dropSchema: true,
    });

    await dataSource.initialize();
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    throw error;
  }

  // 初始化Redis连接
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        return Math.min(times * 50, 2000);
      },
    });

    await redisClient.ping();
    console.log('✅ Test Redis connected');
  } catch (error) {
    console.error('❌ Test Redis connection failed:', error);
    throw error;
  }
});

// 每个测试后清理数据
afterEach(async () => {
  if (!shouldInitializeEnv) {
    return;
  }

  if (dataSource && dataSource.isInitialized) {
    // 清理所有表数据（使用CASCADE处理外键约束）
    try {
      await dataSource.query('TRUNCATE TABLE messages, conversations, customer_profiles, requirements, tasks, domain_events CASCADE');
    } catch (error) {
      // 如果表不存在，使用DELETE逐个清理
      console.warn('⚠️ TRUNCATE failed, falling back to DELETE');
      const entities = dataSource.entityMetadatas;
      // 按依赖顺序清理（先清理子表）
      for (const entity of entities.reverse()) {
        try {
          await dataSource.query(`DELETE FROM "${entity.tableName}"`);
        } catch (e) {
          // 忽略表不存在的错误
        }
      }
    }
  }

  // 清理Redis缓存
  if (redisClient && redisClient.status === 'ready') {
    await redisClient.flushdb();
  }
});

// 测试完成后断开连接
afterAll(async () => {
  if (!shouldInitializeEnv) {
    return;
  }

  console.log('🧹 Cleaning up test environment...');

  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
    console.log('✅ Test database disconnected');
  }

  if (redisClient && redisClient.status === 'ready') {
    await redisClient.quit();
    console.log('✅ Test Redis disconnected');
  }
});

// ============================================
// Mock全局对象
// ============================================

// Mock console（减少测试输出）
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  };
}

// ============================================
// 导出测试工具
// ============================================

export { dataSource, redisClient };
