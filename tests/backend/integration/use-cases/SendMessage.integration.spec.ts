/**
 * SendMessage Integration Test
 *
 * 测试从Use Case到Repository的完整流程
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SendMessageUseCase } from '../../../src/application/use-cases/SendMessageUseCase';
import { ConversationRepository } from '../../../src/infrastructure/repositories/ConversationRepository';
import { EventBus } from '../../../src/infrastructure/events/EventBus';
import { Conversation } from '../../../src/domain/conversation/models/Conversation';
import { Channel } from '../../../src/domain/conversation/value-objects/Channel';
import { DataSource } from 'typeorm';
import { getTestDataSource } from '../../helpers/testDatabase';
const describeWithDb = process.env.SKIP_TEST_ENV_SETUP === 'true' ? describe.skip : describe;

describeWithDb('SendMessage Integration Test', () => {
  let dataSource: DataSource;
  let conversationRepository: ConversationRepository;
  let eventBus: EventBus;
  let sendMessageUseCase: SendMessageUseCase;
  let testConversation: Conversation;

  beforeEach(async () => {
    // 1. 初始化测试数据库
    dataSource = await getTestDataSource();
    await dataSource.synchronize(true); // 清空并重建表

    // 2. 创建依赖
    conversationRepository = new ConversationRepository(dataSource);
    eventBus = new EventBus();
    sendMessageUseCase = new SendMessageUseCase(
      conversationRepository,
      eventBus,
    );

    // 3. 创建测试数据
    testConversation = Conversation.create({
      customerId: 'CUST-001',
      channel: Channel.fromString('web'),
      agentId: 'AGENT-001',
    });

    await conversationRepository.save(testConversation);
  });

  afterEach(async () => {
    // 清理测试数据
    await dataSource.destroy();
  });

  it('应该成功发送消息并持久化到数据库', async () => {
    // Arrange
    const request = {
      conversationId: testConversation.id,
      senderId: 'CUST-001',
      senderType: 'external' as const,
      content: '我的订单什么时候能发货？',
    };

    // Act
    const result = await sendMessageUseCase.execute(request);

    // Assert
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.message.content).toBe(request.content);

    // 验证数据库持久化
    const loadedConversation = await conversationRepository.findById(
      testConversation.id,
    );
    expect(loadedConversation).toBeDefined();
    expect(loadedConversation!.messages).toHaveLength(1);
    expect(loadedConversation!.messages[0].content).toBe(request.content);
  });

  it('应该在发送消息后发布MessageSent领域事件', async () => {
    // Arrange
    const request = {
      conversationId: testConversation.id,
      senderId: 'AGENT-001',
      senderType: 'internal' as const,
      content: '您的订单预计明天发货',
    };

    let publishedEvent: any = null;
    eventBus.subscribe('MessageSent', (event) => {
      publishedEvent = event;
    });

    // Act
    await sendMessageUseCase.execute(request);

    // Assert
    expect(publishedEvent).toBeDefined();
    expect(publishedEvent.eventType).toBe('MessageSent');
    expect(publishedEvent.conversationId).toBe(testConversation.id);
    expect(publishedEvent.content).toBe(request.content);
  });

  it('当对话不存在时应该抛出错误', async () => {
    // Arrange
    const request = {
      conversationId: 'NON-EXISTENT-ID',
      senderId: 'CUST-001',
      senderType: 'external' as const,
      content: '测试消息',
    };

    // Act & Assert
    await expect(sendMessageUseCase.execute(request)).rejects.toThrow(
      'Conversation not found',
    );
  });

  it('当发送人不是参与者时应该抛出错误', async () => {
    // Arrange
    const request = {
      conversationId: testConversation.id,
      senderId: 'UNKNOWN-SENDER',
      senderType: 'external' as const,
      content: '测试消息',
    };

    // Act & Assert
    await expect(sendMessageUseCase.execute(request)).rejects.toThrow(
      'Sender is not a participant',
    );
  });

  it('当消息内容为空时应该抛出错误', async () => {
    // Arrange
    const request = {
      conversationId: testConversation.id,
      senderId: 'CUST-001',
      senderType: 'external' as const,
      content: '',
    };

    // Act & Assert
    await expect(sendMessageUseCase.execute(request)).rejects.toThrow(
      'content is required',
    );
  });

  it('应该正确更新对话的updatedAt时间戳', async () => {
    // Arrange
    const originalUpdatedAt = testConversation.updatedAt;
    await new Promise((resolve) => setTimeout(resolve, 10)); // 确保时间戳不同

    const request = {
      conversationId: testConversation.id,
      senderId: 'CUST-001',
      senderType: 'external' as const,
      content: '测试消息',
    };

    // Act
    await sendMessageUseCase.execute(request);

    // Assert
    const loadedConversation = await conversationRepository.findById(
      testConversation.id,
    );
    expect(loadedConversation!.updatedAt.getTime()).toBeGreaterThan(
      originalUpdatedAt.getTime(),
    );
  });
});
