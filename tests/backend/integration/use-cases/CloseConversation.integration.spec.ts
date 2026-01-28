/**
 * CloseConversation Integration Test
 *
 * 测试关闭对话的完整流程
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CloseConversationUseCase } from '../../../src/application/use-cases/CloseConversationUseCase';
import { ConversationRepository } from '../../../src/infrastructure/repositories/ConversationRepository';
import { EventBus } from '../../../src/infrastructure/events/EventBus';
import { Conversation } from '../../../src/domain/conversation/models/Conversation';
import { Channel } from '../../../src/domain/conversation/value-objects/Channel';
import { DataSource } from 'typeorm';
import { getTestDataSource } from '../../helpers/testDatabase';
const describeWithDb = process.env.SKIP_TEST_ENV_SETUP === 'true' ? describe.skip : describe;

describeWithDb('CloseConversation Integration Test', () => {
  let dataSource: DataSource;
  let conversationRepository: ConversationRepository;
  let eventBus: EventBus;
  let closeConversationUseCase: CloseConversationUseCase;
  let testConversation: Conversation;

  beforeEach(async () => {
    // 1. 初始化测试数据库
    dataSource = await getTestDataSource();
    await dataSource.synchronize(true);

    // 2. 创建依赖
    conversationRepository = new ConversationRepository(dataSource);
    eventBus = new EventBus();
    closeConversationUseCase = new CloseConversationUseCase(
      conversationRepository,
      eventBus,
    );

    // 3. 创建测试数据
    testConversation = Conversation.create({
      title: '测试对话',
      channel: Channel.fromString('web'),
      customerId: 'CUST-001',
      customerName: '张三',
    });

    await conversationRepository.save(testConversation);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('应该成功关闭对话并持久化到数据库', async () => {
    // Arrange
    const request = {
      conversationId: testConversation.id,
      closedBy: 'AGENT-001',
      reason: '问题已解决',
    };

    // Act
    const result = await closeConversationUseCase.execute(request);

    // Assert
    expect(result.success).toBe(true);
    expect(result.conversationId).toBe(testConversation.id);
    expect(result.status).toBe('closed');
    expect(result.closedAt).toBeDefined();

    // 验证数据库持久化
    const loadedConversation = await conversationRepository.findById(
      testConversation.id,
    );
    expect(loadedConversation!.status).toBe('closed');
    expect(loadedConversation!.closedAt).toBeDefined();
  });

  it('应该在关闭对话后发布ConversationClosed领域事件', async () => {
    // Arrange
    const request = {
      conversationId: testConversation.id,
      closedBy: 'AGENT-001',
      reason: '问题已解决',
    };

    let publishedEvent: any = null;
    eventBus.subscribe('ConversationClosed', (event) => {
      publishedEvent = event;
    });

    // Act
    await closeConversationUseCase.execute(request);

    // Assert
    expect(publishedEvent).toBeDefined();
    expect(publishedEvent.eventType).toBe('ConversationClosed');
    expect(publishedEvent.conversationId).toBe(testConversation.id);
    expect(publishedEvent.reason).toBe('问题已解决');
  });

  it('当对话不存在时应该抛出错误', async () => {
    // Arrange
    const request = {
      conversationId: 'NON-EXISTENT-ID',
      closedBy: 'AGENT-001',
    };

    // Act & Assert
    await expect(closeConversationUseCase.execute(request)).rejects.toThrow(
      'Conversation not found',
    );
  });

  it('当conversationId缺失时应该抛出错误', async () => {
    // Arrange
    const request = {
      conversationId: '',
      closedBy: 'AGENT-001',
    };

    // Act & Assert
    await expect(closeConversationUseCase.execute(request)).rejects.toThrow(
      'conversationId is required',
    );
  });

  it('当closedBy缺失时应该抛出错误', async () => {
    // Arrange
    const request = {
      conversationId: testConversation.id,
      closedBy: '',
    };

    // Act & Assert
    await expect(closeConversationUseCase.execute(request)).rejects.toThrow(
      'closedBy is required',
    );
  });
});
