/**
 * Test Database Helper
 *
 * 为测试提供独立的数据库连接
 */

import { ConversationEntity } from '../../../backend/src/infrastructure/database/entities/ConversationEntity.js';
import { MessageEntity } from '../../../backend/src/infrastructure/database/entities/MessageEntity.js';
import { CustomerProfileEntity } from '../../../backend/src/infrastructure/database/entities/CustomerProfileEntity.js';
import { RequirementEntity } from '../../../backend/src/infrastructure/database/entities/RequirementEntity.js';
import { TaskEntity } from '../../../backend/src/infrastructure/database/entities/TaskEntity.js';
import { KnowledgeItemEntity } from '../../../backend/src/infrastructure/database/entities/KnowledgeItemEntity.js';
import { DomainEventEntity } from '../../../backend/src/infrastructure/database/entities/DomainEventEntity.js';
import { OutboxEventEntity } from '../../../backend/src/infrastructure/database/entities/OutboxEventEntity.js';
import { ReviewRequestEntity } from '../../../backend/src/infrastructure/database/entities/ReviewRequestEntity.js';
import { ProblemEntity } from '../../../backend/src/infrastructure/database/entities/ProblemEntity.js';
import { QualityReportEntity } from '../../../backend/src/infrastructure/database/entities/QualityReportEntity.js';
import { SurveyEntity } from '../../../backend/src/infrastructure/database/entities/SurveyEntity.js';
import { AuditEventEntity } from '../../../backend/src/infrastructure/database/entities/AuditEventEntity.js';
import { MonitoringAlertEntity } from '../../../backend/src/infrastructure/database/entities/MonitoringAlertEntity.js';
import { RoleEntity } from '../../../backend/src/infrastructure/database/entities/RoleEntity.js';
import { UserEntity } from '../../../backend/src/infrastructure/database/entities/UserEntity.js';

let testDataSource: any | null = null;

export async function getTestDataSource(): Promise<any> {
  if (testDataSource && testDataSource.isInitialized) {
    return testDataSource;
  }

  const { DataSource } = await import('../../../backend/node_modules/typeorm/index.js');
  testDataSource = new DataSource({
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
    dropSchema: true, // 每次测试前清空数据库
  });

  await testDataSource.initialize();
  return testDataSource;
}

export async function closeTestDataSource(): Promise<void> {
  if (testDataSource && testDataSource.isInitialized) {
    await testDataSource.destroy();
    testDataSource = null;
  }
}
