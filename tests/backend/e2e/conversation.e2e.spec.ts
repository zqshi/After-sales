/**
 * Conversation API E2E Tests
 *
 * 端到端测试HTTP API
 */

import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { createApp } from '../../../backend/src/app';
import { closeTestDataSource, getTestDataSource } from '../helpers/testDatabase';
import { Conversation } from '../../../backend/src/domain/conversation/models/Conversation';
import { Channel } from '../../../backend/src/domain/conversation/value-objects/Channel';
import { ConversationRepository } from '../../../backend/src/infrastructure/repositories/ConversationRepository';
const describeWithDb = process.env.SKIP_TEST_ENV_SETUP === 'true' ? describe.skip : describe;
const API_PREFIX = '/api/v1/api';

describeWithDb('Conversation API E2E Tests', () => {
  let app: FastifyInstance;
  let authHeaders: Record<string, string>;
  let dataSource: DataSource;
  let conversationRepository: ConversationRepository;
  let testConversationId: string;

  const withAuth = (options: Parameters<FastifyInstance['inject']>[0]) => app.inject({ ...options, headers: authHeaders });
  beforeAll(async () => {
    // 创建测试应用
    dataSource = await getTestDataSource();
    app = await createApp(dataSource);
    await app.ready();
    const token = app.jwt.sign({ sub: 'AGENT-E2E-001', role: 'admin' });
    authHeaders = { Authorization: `Bearer ${token}` };
  });

  beforeEach(async () => {
    // 清空并重建表
    await dataSource.synchronize(true);

    // 创建测试数据
    conversationRepository = new ConversationRepository(dataSource);
    const conversation = Conversation.create({
      customerId: 'CUST-E2E-001',
      channel: Channel.fromString('email'),
      agentId: 'AGENT-E2E-001',
      metadata: {
        title: 'E2E测试对话',
      },
    });

    await conversationRepository.save(conversation);
    testConversationId = conversation.id;
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  describe('POST /api/conversations/:id/messages', () => {
    it('应该成功发送消息并返回201状态码', async () => {
      // Arrange
      const payload = {
        senderId: 'CUST-E2E-001',
        senderType: 'external',
        content: '我想咨询一个问题',
      };

      // Act
      const response = await withAuth({
        method: 'POST',
        url: `${API_PREFIX}/conversations/${testConversationId}/messages`,
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.messageId).toBeDefined();
      expect(body.data.message.content).toBe(payload.content);
    });

    it('当对话不存在时应该返回404错误', async () => {
      // Arrange
      const payload = {
        senderId: 'CUST-E2E-001',
        senderType: 'external',
        content: '测试消息',
      };

      // Act
      const response = await withAuth({
        method: 'POST',
        url: `${API_PREFIX}/conversations/NON-EXISTENT-ID/messages`,
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Conversation not found');
    });

    it('当请求参数缺失时应该返回400错误', async () => {
      // Arrange
      const payload = {
        senderId: 'CUST-E2E-001',
        senderType: 'external',
        // content 缺失
      };

      // Act
      const response = await withAuth({
        method: 'POST',
        url: `${API_PREFIX}/conversations/${testConversationId}/messages`,
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('当消息内容为空时应该返回400错误', async () => {
      // Arrange
      const payload = {
        senderId: 'CUST-E2E-001',
        senderType: 'external',
        content: '',
      };

      // Act
      const response = await withAuth({
        method: 'POST',
        url: `${API_PREFIX}/conversations/${testConversationId}/messages`,
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/conversations/:id/close', () => {
    it('应该成功关闭对话并返回200状态码', async () => {
      // Arrange
      const payload = {
        closedBy: 'AGENT-E2E-001',
        reason: '问题已解决',
      };

      // Act
      const response = await withAuth({
        method: 'POST',
        url: `${API_PREFIX}/conversations/${testConversationId}/close`,
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.conversationId).toBe(testConversationId);
      expect(body.data.status).toBe('closed');
      expect(body.data.closedAt).toBeDefined();
    });

    it('IM渠道对话不允许关闭', async () => {
      const imConversation = Conversation.create({
        customerId: 'CUST-E2E-IM-001',
        channel: Channel.fromString('web'),
        agentId: 'AGENT-E2E-001',
      });
      await conversationRepository.save(imConversation);

      const response = await withAuth({
        method: 'POST',
        url: `${API_PREFIX}/conversations/${imConversation.id}/close`,
        payload: {
          closedBy: 'AGENT-E2E-001',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('IM渠道不支持关闭对话');
    });

    it('当对话不存在时应该返回404错误', async () => {
      // Arrange
      const payload = {
        closedBy: 'AGENT-E2E-001',
        reason: '问题已解决',
      };

      // Act
      const response = await withAuth({
        method: 'POST',
        url: `${API_PREFIX}/conversations/NON-EXISTENT-ID/close`,
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Conversation not found');
    });

    it('当closedBy缺失时应该返回400错误', async () => {
      // Arrange
      const payload = {
        reason: '问题已解决',
        // closedBy 缺失
      };

      // Act
      const response = await withAuth({
        method: 'POST',
        url: `${API_PREFIX}/conversations/${testConversationId}/close`,
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/conversations/:id', () => {
    beforeEach(async () => {
      // 添加一些消息到测试对话
      const conversation = await conversationRepository.findById(
        testConversationId,
      );
      conversation!.sendMessage({
        senderId: 'CUST-E2E-001',
        senderType: 'external',
        content: '测试消息1',
      });
      conversation!.sendMessage({
        senderId: 'AGENT-E2E-001',
        senderType: 'internal',
        content: '测试回复1',
      });
      await conversationRepository.save(conversation!);
    });

    it('应该成功获取对话详情并返回200状态码', async () => {
      // Act
      const response = await withAuth({
        method: 'GET',
        url: `${API_PREFIX}/conversations/${testConversationId}`,
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(testConversationId);
      expect(body.data.title).toBe('E2E测试对话');
      expect(body.data.status).toBe('open');
      expect(body.data.messages).toHaveLength(2);
    });

    it('应该支持includeMessages=false参数', async () => {
      // Act
      const response = await withAuth({
        method: 'GET',
        url: `${API_PREFIX}/conversations/${testConversationId}?includeMessages=false`,
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.messages).toHaveLength(0); // 不包含消息
    });

    it('应该返回完整的客户等级信息', async () => {
      // Act
      const response = await withAuth({
        method: 'GET',
        url: `${API_PREFIX}/conversations/${testConversationId}`,
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.slaInfo).toBeDefined();
      expect(body.data.slaInfo.status).toBeDefined();
      expect(body.data.slaInfo.responseTime).toBeDefined();
      expect(body.data.slaInfo.threshold).toBeDefined();
      expect(typeof body.data.slaInfo.violated).toBe('boolean');
    });

    it('当对话不存在时应该返回404错误', async () => {
      // Act
      const response = await withAuth({
        method: 'GET',
        url: `${API_PREFIX}/conversations/NON-EXISTENT-ID`,
      });

      // Assert
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Conversation not found');
    });
  });

  describe('POST /api/conversations', () => {
    it('should create a new conversation with an initial message', async () => {
      const payload = {
        customerId: 'CUST-E2E-NEW',
        channel: 'chat',
        initialMessage: {
          senderId: 'CUST-E2E-NEW',
          senderType: 'external',
          content: '希望开启对话',
        },
      };

      const response = await withAuth({
        method: 'POST',
        url: `${API_PREFIX}/conversations`,
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.messages).toHaveLength(1);
      expect(body.data.messages[0].content).toBe(payload.initialMessage.content);
    });
  });

  describe('GET /api/conversations', () => {
    it('should return paginated conversation lists', async () => {
      const response = await withAuth({
        method: 'GET',
        url: `${API_PREFIX}/conversations?customerId=CUST-E2E-001&page=1&limit=5`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(body.data.total).toBeGreaterThanOrEqual(1);
      expect(body.data.page).toBe(1);
      expect(body.data.limit).toBe(5);
    });
  });

  describe('完整业务流程测试', () => {
    it('应该支持完整的对话生命周期：创建->发送消息->关闭', async () => {
      // 1. 发送第一条消息
      let response = await withAuth({
        method: 'POST',
        url: `${API_PREFIX}/conversations/${testConversationId}/messages`,
        payload: {
          senderId: 'CUST-E2E-001',
          senderType: 'external',
          content: '我需要帮助',
        },
      });
      expect(response.statusCode).toBe(201);

      // 2. 发送客服回复
      response = await withAuth({
        method: 'POST',
        url: `${API_PREFIX}/conversations/${testConversationId}/messages`,
        payload: {
          senderId: 'AGENT-E2E-001',
          senderType: 'internal',
          content: '我来帮您',
        },
      });
      expect(response.statusCode).toBe(201);

      // 3. 获取对话详情
      response = await withAuth({
        method: 'GET',
        url: `${API_PREFIX}/conversations/${testConversationId}`,
      });
      expect(response.statusCode).toBe(200);
      let body = JSON.parse(response.body);
      expect(body.data.messages).toHaveLength(2);

      // 4. 关闭对话
      response = await withAuth({
        method: 'POST',
        url: `${API_PREFIX}/conversations/${testConversationId}/close`,
        payload: {
          closedBy: 'AGENT-E2E-001',
          reason: '问题已解决',
        },
      });
      expect(response.statusCode).toBe(200);

      // 5. 验证对话已关闭
      response = await withAuth({
        method: 'GET',
        url: `${API_PREFIX}/conversations/${testConversationId}`,
      });
      body = JSON.parse(response.body);
      expect(body.data.status).toBe('closed');
      expect(body.data.closedAt).toBeDefined();
    });
  });
});
