/**
 * GetConversation Integration Test
 *
 * 测试获取对话详情的完整流程
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GetConversationUseCase } from '../../../src/application/use-cases/GetConversationUseCase';
import { ConversationRepository } from '../../../src/infrastructure/repositories/ConversationRepository';
import { Conversation } from '../../../src/domain/conversation/models/Conversation';
import { Channel } from '../../../src/domain/conversation/value-objects/Channel';
import { DataSource } from 'typeorm';
import { getTestDataSource } from '../../helpers/testDatabase';

describe('GetConversation Integration Test', () => {
  let dataSource: DataSource;
  let conversationRepository: ConversationRepository;
  let getConversationUseCase: GetConversationUseCase;
  let testConversation: Conversation;

  beforeEach(async () => {
    // 1. 初始化测试数据库
    dataSource = await getTestDataSource();
    await dataSource.synchronize(true);

    // 2. 创建依赖
    conversationRepository = new ConversationRepository(dataSource);
    getConversationUseCase = new GetConversationUseCase(
      conversationRepository,
    );

    // 3. 创建测试数据
    const slaDeadline = new Date(Date.now() + 60 * 60 * 1000);

    testConversation = Conversation.create({
      customerId: 'CUST-001',
      channel: Channel.fromString('web'),
      agentId: 'AGENT-001',
      metadata: { title: '测试对话' },
      slaDeadline,
    });

    (testConversation as { participants?: unknown }).participants = [
      { id: 'CUST-001', name: 'Customer', role: 'customer' },
      { id: 'AGENT-001', name: 'Agent', role: 'agent' },
    ];

    testConversation.sendMessage({
      senderId: 'CUST-001',
      senderType: 'customer',
      content: '我有个问题',
    });

    await conversationRepository.save(testConversation);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('应该成功获取对话详情（包含消息）', async () => {
    // Arrange
    const request = {
      conversationId: testConversation.id,
      includeMessages: true,
    };

    // Act
    const result = await getConversationUseCase.execute(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBe(testConversation.id);
    expect(result.title).toBe('测试对话');
    expect(result.status).toBe('open');
    expect(result.channel).toBe('web');
    expect(result.participants).toHaveLength(2); // 客户 + 客服
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('我有个问题');
  });

  it('应该成功获取对话详情（不包含消息）', async () => {
    // Arrange
    const request = {
      conversationId: testConversation.id,
      includeMessages: false,
    };

    // Act
    const result = await getConversationUseCase.execute(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBe(testConversation.id);
    expect(result.messages).toHaveLength(0); // 不包含消息
  });

  it('应该返回完整的SLA信息', async () => {
    // Arrange
    const request = {
      conversationId: testConversation.id,
    };

    // Act
    const result = await getConversationUseCase.execute(request);

    // Assert
    expect(result.slaInfo).toBeDefined();
    expect(result.slaInfo.status).toBeDefined();
    expect(result.slaInfo.responseTime).toBeGreaterThanOrEqual(0);
    expect(result.slaInfo.threshold).toBeGreaterThan(0);
    expect(typeof result.slaInfo.violated).toBe('boolean');
  });

  it('应该返回完整的时间戳信息', async () => {
    // Arrange
    const request = {
      conversationId: testConversation.id,
    };

    // Act
    const result = await getConversationUseCase.execute(request);

    // Assert
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
    expect(result.closedAt).toBeUndefined(); // 对话未关闭
  });

  it('当对话不存在时应该抛出错误', async () => {
    // Arrange
    const request = {
      conversationId: 'NON-EXISTENT-ID',
    };

    // Act & Assert
    await expect(getConversationUseCase.execute(request)).rejects.toThrow(
      'Conversation not found',
    );
  });

  it('当conversationId缺失时应该抛出错误', async () => {
    // Arrange
    const request = {
      conversationId: '',
    };

    // Act & Assert
    await expect(getConversationUseCase.execute(request)).rejects.toThrow(
      'conversationId is required',
    );
  });
});
