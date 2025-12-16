/**
 * Test Database Helper
 *
 * 为测试提供独立的数据库连接
 */

import { DataSource } from 'typeorm';
import { ConversationEntity } from '../../src/infrastructure/database/entities/ConversationEntity.js';
import { MessageEntity } from '../../src/infrastructure/database/entities/MessageEntity.js';
import { CustomerProfileEntity } from '../../src/infrastructure/database/entities/CustomerProfileEntity.js';
import { RequirementEntity } from '../../src/infrastructure/database/entities/RequirementEntity.js';
import { TaskEntity } from '../../src/infrastructure/database/entities/TaskEntity.js';
import { KnowledgeItemEntity } from '../../src/infrastructure/database/entities/KnowledgeItemEntity.js';
import { DomainEventEntity } from '../../src/infrastructure/database/entities/DomainEventEntity.js';

let testDataSource: DataSource | null = null;

export async function getTestDataSource(): Promise<DataSource> {
  if (testDataSource && testDataSource.isInitialized) {
    return testDataSource;
  }

  testDataSource = new DataSource({
    type: 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    username: process.env.TEST_DB_USER || 'admin',
    password: process.env.TEST_DB_PASSWORD || 'admin123',
    database: process.env.TEST_DB_NAME || 'aftersales_test',
    entities: [ConversationEntity, MessageEntity, CustomerProfileEntity, RequirementEntity, TaskEntity, KnowledgeItemEntity, DomainEventEntity],
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
