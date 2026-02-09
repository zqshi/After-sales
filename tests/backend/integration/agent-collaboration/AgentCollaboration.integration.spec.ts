/**
 * Agent协作集成测试
 *
 * 测试覆盖：
 * 1. AgentScope服务与Backend的集成
 * 2. 多Agent协作流程
 * 3. 事件驱动的异步处理
 * 4. 质检流程集成
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConversationTaskCoordinator } from '@application/services/ConversationTaskCoordinator';
import { AiService } from '@application/services/AiService';
import { AgentScopeChatClient } from '@infrastructure/agentscope/AgentScopeChatClient';
import { EventBus } from '@infrastructure/events/EventBus';
import { ConversationClosedEvent } from '@domain/conversation/events/ConversationClosedEvent';
import type { IncomingMessage } from '@application/services/ConversationTaskCoordinator';

vi.mock('@config/app.config', () => ({
  config: {
    app: {
      baseUrl: 'http://localhost:3000',
    },
    agentscope: {
      serviceUrl: 'http://localhost:8000',
      timeout: 30000,
      circuitBreaker: {
        enabled: false,
        failureThreshold: 5,
        resetTimeout: 60000,
      },
    },
    workflow: {
      enabled: false,
    },
    requirement: {
      confidenceThreshold: 0.7,
    },
    quality: {
      lowScoreThreshold: 70,
    },
  },
}));

// ============================================
// Mock Dependencies
// ============================================

const createMockConversationRepository = () => ({
  findByFilters: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
});

const createMockTaskRepository = () => ({
  findByFilters: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
});

const createMockRequirementRepository = () => ({
  findByFilters: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
});

const createMockProblemRepository = () => ({
  findByFilters: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
  findActiveByConversationId: vi.fn(),
  findLatestResolvedByConversationId: vi.fn(),
});

const createMockQualityReportRepository = () => ({
  findByFilters: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
});

const createMockUseCases = () => ({
  createConversation: { execute: vi.fn() },
  createRequirement: { execute: vi.fn() },
  createTask: { execute: vi.fn() },
  closeConversation: { execute: vi.fn() },
  sendMessage: { execute: vi.fn() },
  associateRequirement: { execute: vi.fn() },
  createProblem: { execute: vi.fn() },
  updateProblemStatus: { execute: vi.fn() },
  createReviewRequest: { execute: vi.fn() },
});

const createMockAiService = () => ({
  summarizeConversation: vi.fn(),
  analyzeSentiment: vi.fn(),
  detectProblemIntent: vi.fn(),
  detectProblemResolution: vi.fn(),
  knowledgeRepository: {
    findByFilters: vi.fn(),
  },
});

// ============================================
// Test Suite
// ============================================

describe('Agent Collaboration Integration', () => {
  let coordinator: ConversationTaskCoordinator;
  let mockConversationRepo: ReturnType<typeof createMockConversationRepository>;
  let mockTaskRepo: ReturnType<typeof createMockTaskRepository>;
  let mockRequirementRepo: ReturnType<typeof createMockRequirementRepository>;
  let mockProblemRepo: ReturnType<typeof createMockProblemRepository>;
  let mockQualityReportRepo: ReturnType<typeof createMockQualityReportRepository>;
  let mockUseCases: ReturnType<typeof createMockUseCases>;
  let mockAiService: ReturnType<typeof createMockAiService>;
  let mockEventBus: EventBus;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // 保存原始fetch
    originalFetch = global.fetch;

    // 重置所有mocks
    mockConversationRepo = createMockConversationRepository();
    mockTaskRepo = createMockTaskRepository();
    mockRequirementRepo = createMockRequirementRepository();
    mockProblemRepo = createMockProblemRepository();
    mockQualityReportRepo = createMockQualityReportRepository();
    mockUseCases = createMockUseCases();
    mockAiService = createMockAiService();
    mockEventBus = new EventBus();

    // 创建coordinator实例
    coordinator = new ConversationTaskCoordinator(
      mockConversationRepo as any,
      mockTaskRepo as any,
      mockRequirementRepo as any,
      mockProblemRepo as any,
      mockUseCases.createConversation as any,
      mockUseCases.createRequirement as any,
      mockUseCases.createTask as any,
      mockUseCases.closeConversation as any,
      mockUseCases.sendMessage as any,
      mockUseCases.associateRequirement as any,
      mockUseCases.createProblem as any,
      mockUseCases.updateProblemStatus as any,
      mockUseCases.createReviewRequest as any,
      mockAiService as any,
      mockEventBus as any,
      mockQualityReportRepo as any,
      { save: async () => ({}) } as any,
    );
    mockUseCases.createReviewRequest.execute.mockResolvedValue({ id: 'review-001' });
  });

  afterEach(() => {
    // 恢复原始fetch
    global.fetch = originalFetch;
  });

  // ============================================
  // AgentScope服务集成测试
  // ============================================

  describe('AgentScope Service Integration', () => {
    it('应该成功调用AgentScope服务生成回复', async () => {
      const incomingMessage: IncomingMessage = {
        customerId: 'customer-001',
        content: '我的订单什么时候发货？',
        channel: 'web',
        senderId: 'user-001',
      };

      // Mock: 没有现有对话
      mockConversationRepo.findByFilters.mockResolvedValue([]);

      // Mock: 创建新对话
      const mockConversation = {
        id: 'conv-001',
        customerId: 'customer-001',
        messages: [],
      };
      mockUseCases.createConversation.execute.mockResolvedValue(mockConversation);

      // Mock: AgentScope服务返回
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: '您的订单预计3天内发货，请耐心等待。',
          confidence: 0.9,
          agent_name: 'assistant_agent',
          mode: 'auto',
          metadata: {
            sentiment: 'neutral',
            intent: 'order_inquiry',
          },
        }),
      });

      // Mock: AI服务
      mockAiService.analyzeSentiment.mockResolvedValue({
        overallSentiment: 'neutral',
      });
      mockAiService.knowledgeRepository.findByFilters.mockResolvedValue([]);
      mockAiService.detectProblemIntent.mockResolvedValue({
        isProblem: false,
      });
      mockAiService.detectProblemResolution.mockResolvedValue({
        resolved: false,
      });

      // Mock: Problem repository
      mockProblemRepo.findActiveByConversationId.mockResolvedValue(null);
      mockProblemRepo.findLatestResolvedByConversationId.mockResolvedValue(null);

      const result = await coordinator.processCustomerMessage(incomingMessage);

      expect(result.agentSuggestion).toBeDefined();
      expect(result.agentSuggestion?.suggestedReply).toContain('3天内发货');
      expect(result.agentSuggestion?.confidence).toBeGreaterThan(0.8);
      expect(result.agentSuggestion?.agentName).toBe('assistant_agent');
    });

    it('应该在AgentScope服务失败时使用降级方案', async () => {
      const incomingMessage: IncomingMessage = {
        customerId: 'customer-001',
        content: '你好',
        channel: 'web',
        senderId: 'user-001',
      };

      // Mock: 没有现有对话
      mockConversationRepo.findByFilters.mockResolvedValue([]);

      // Mock: 创建新对话
      const mockConversation = {
        id: 'conv-001',
        customerId: 'customer-001',
        messages: [],
      };
      mockUseCases.createConversation.execute.mockResolvedValue(mockConversation);

      // Mock: AgentScope服务失败
      global.fetch = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      // Mock: AI服务
      mockAiService.analyzeSentiment.mockResolvedValue({
        overallSentiment: 'neutral',
      });
      mockAiService.knowledgeRepository.findByFilters.mockResolvedValue([]);
      mockAiService.detectProblemIntent.mockResolvedValue({
        isProblem: false,
      });
      mockAiService.detectProblemResolution.mockResolvedValue({
        resolved: false,
      });

      // Mock: Problem repository
      mockProblemRepo.findActiveByConversationId.mockResolvedValue(null);
      mockProblemRepo.findLatestResolvedByConversationId.mockResolvedValue(null);

      const result = await coordinator.processCustomerMessage(incomingMessage);

      expect(result.agentSuggestion).toBeDefined();
      expect(result.agentSuggestion?.suggestedReply).toBeDefined();
      expect(result.agentSuggestion?.confidence).toBeLessThan(0.7);
    });

    it('应该处理AgentScope服务超时', async () => {
      const incomingMessage: IncomingMessage = {
        customerId: 'customer-001',
        content: '紧急问题',
        channel: 'web',
        senderId: 'user-001',
      };

      // Mock: 没有现有对话
      mockConversationRepo.findByFilters.mockResolvedValue([]);

      // Mock: 创建新对话
      const mockConversation = {
        id: 'conv-001',
        customerId: 'customer-001',
        messages: [],
      };
      mockUseCases.createConversation.execute.mockResolvedValue(mockConversation);

      // Mock: AgentScope服务超时
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });

      // Mock: AI服务
      mockAiService.analyzeSentiment.mockResolvedValue({
        overallSentiment: 'negative',
      });
      mockAiService.knowledgeRepository.findByFilters.mockResolvedValue([]);
      mockAiService.detectProblemIntent.mockResolvedValue({
        isProblem: true,
        title: '紧急问题',
        intent: 'urgent_inquiry',
        confidence: 0.8,
      });
      mockAiService.detectProblemResolution.mockResolvedValue({
        resolved: false,
      });

      // Mock: Problem repository
      mockProblemRepo.findActiveByConversationId.mockResolvedValue(null);
      mockProblemRepo.findLatestResolvedByConversationId.mockResolvedValue(null);

      // Mock: 创建Problem
      mockUseCases.createProblem.execute.mockResolvedValue({
        id: 'problem-001',
        status: 'new',
      });

      const result = await coordinator.processCustomerMessage(incomingMessage);

      expect(result.agentSuggestion).toBeDefined();
      expect(result.status).toBe('needs_review');
    });
  });

  // ============================================
  // 多Agent协作流程测试
  // ============================================

  describe('Multi-Agent Collaboration', () => {
    it('应该协调多个Agent处理复杂问题', async () => {
      const incomingMessage: IncomingMessage = {
        customerId: 'customer-001',
        content: '我的产品出现故障，需要技术支持和退款',
        channel: 'web',
        senderId: 'user-001',
      };

      // Mock: 没有现有对话
      mockConversationRepo.findByFilters.mockResolvedValue([]);

      // Mock: 创建新对话
      const mockConversation = {
        id: 'conv-001',
        customerId: 'customer-001',
        messages: [],
      };
      mockUseCases.createConversation.execute.mockResolvedValue(mockConversation);

      // Mock: AgentScope服务返回（Orchestrator协调多个Agent）
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: '我们已经为您安排了技术支持工程师，同时启动退款流程。',
          confidence: 0.85,
          agent_name: 'orchestrator_agent',
          mode: 'parallel',
          metadata: {
            agents_involved: ['engineer_agent', 'assistant_agent'],
            tasks_created: ['technical_support', 'refund_process'],
          },
        }),
      });

      // Mock: 创建需求
      mockUseCases.createRequirement.execute.mockResolvedValue({
        id: 'req-001',
        title: '产品故障技术支持',
      });

      // Mock: 创建任务
      mockUseCases.createTask.execute.mockResolvedValue({
        id: 'task-001',
        title: '处理需求: 产品故障技术支持',
      });

      // Mock: AI服务
      mockAiService.analyzeSentiment.mockResolvedValue({
        overallSentiment: 'negative',
      });
      mockAiService.knowledgeRepository.findByFilters.mockResolvedValue([]);
      mockAiService.detectProblemIntent.mockResolvedValue({
        isProblem: true,
        title: '产品故障',
        intent: 'technical_issue',
        confidence: 0.9,
      });
      mockAiService.detectProblemResolution.mockResolvedValue({
        resolved: false,
      });

      // Mock: Problem repository
      mockProblemRepo.findActiveByConversationId.mockResolvedValue(null);
      mockProblemRepo.findLatestResolvedByConversationId.mockResolvedValue(null);

      // Mock: 创建Problem
      mockUseCases.createProblem.execute.mockResolvedValue({
        id: 'problem-001',
        status: 'new',
      });

      const result = await coordinator.processCustomerMessage(incomingMessage);

      expect(result.agentSuggestion).toBeDefined();
      expect(result.agentSuggestion?.agentName).toBe('orchestrator_agent');
      expect(result.agentSuggestion?.metadata?.agents_involved).toContain('engineer_agent');
      expect(result.agentSuggestion?.metadata?.agents_involved).toContain('assistant_agent');
    });

    it('应该处理Agent并行执行失败', async () => {
      const incomingMessage: IncomingMessage = {
        customerId: 'customer-001',
        content: '复杂问题',
        channel: 'web',
        senderId: 'user-001',
      };

      // Mock: 没有现有对话
      mockConversationRepo.findByFilters.mockResolvedValue([]);

      // Mock: 创建新对话
      const mockConversation = {
        id: 'conv-001',
        customerId: 'customer-001',
        messages: [],
      };
      mockUseCases.createConversation.execute.mockResolvedValue(mockConversation);

      // Mock: AgentScope服务返回部分失败
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: '部分Agent执行失败，建议人工介入',
          confidence: 0.5,
          agent_name: 'orchestrator_agent',
          mode: 'parallel',
          metadata: {
            agents_involved: ['engineer_agent'],
            failed_agents: ['assistant_agent'],
            needs_review: true,
          },
        }),
      });

      // Mock: AI服务
      mockAiService.analyzeSentiment.mockResolvedValue({
        overallSentiment: 'neutral',
      });
      mockAiService.knowledgeRepository.findByFilters.mockResolvedValue([]);
      mockAiService.detectProblemIntent.mockResolvedValue({
        isProblem: false,
      });
      mockAiService.detectProblemResolution.mockResolvedValue({
        resolved: false,
      });

      // Mock: Problem repository
      mockProblemRepo.findActiveByConversationId.mockResolvedValue(null);
      mockProblemRepo.findLatestResolvedByConversationId.mockResolvedValue(null);

      // Mock: 创建审核请求
      mockUseCases.createReviewRequest.execute.mockResolvedValue({
        id: 'review-001',
      });

      const result = await coordinator.processCustomerMessage(incomingMessage);

      expect(result.status).toBe('needs_review');
      expect(result.agentSuggestion?.needsHumanReview).toBe(true);
    });
  });

  // ============================================
  // 事件驱动异步处理测试
  // ============================================

  describe('Event-Driven Async Processing', () => {
    it('应该在对话关闭时触发质检流程', async () => {
      const conversationId = 'conv-001';

      // Mock: 质检API成功
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          quality_score: 88,
          report: {
            score: 88,
            strengths: ['响应及时', '态度友好'],
            improvements: ['可以提供更详细的解决方案'],
            follow_up_needed: false,
          },
        }),
      });

      const event = new ConversationClosedEvent(
        { aggregateId: conversationId },
        { resolution: '问题已解决', closedAt: new Date() },
      );

      await coordinator.onConversationClosed(event);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/agents/inspect'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(conversationId),
        }),
      );

      expect(mockQualityReportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId,
          qualityScore: 88,
        }),
      );
    });

    it('应该处理低质量评分并发出警告', async () => {
      const conversationId = 'conv-002';
      const consoleSpy = vi.spyOn(console, 'warn');

      // Mock: 质检API返回低分
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          quality_score: 55,
          report: {
            score: 55,
            strengths: [],
            improvements: ['响应时间过长', '解决方案不够专业'],
            follow_up_needed: true,
          },
        }),
      });

      const event = new ConversationClosedEvent(
        { aggregateId: conversationId },
        { resolution: '对话结束', closedAt: new Date() },
      );

      await coordinator.onConversationClosed(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Low quality score'),
      );
    });

    it('应该在质检失败时不影响对话关闭', async () => {
      const conversationId = 'conv-003';

      // Mock: 质检API失败
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const event = new ConversationClosedEvent(
        { aggregateId: conversationId },
        { resolution: '对话结束', closedAt: new Date() },
      );

      // 不应该抛出错误
      await expect(coordinator.onConversationClosed(event)).resolves.not.toThrow();
    });
  });

  // ============================================
  // 完整业务流程集成测试
  // ============================================

  describe('End-to-End Business Flow', () => {
    it('应该完成从客户消息到质检的完整流程', async () => {
      // 1. 客户发送消息
      const incomingMessage: IncomingMessage = {
        customerId: 'customer-001',
        content: '我的订单有问题',
        channel: 'web',
        senderId: 'user-001',
      };

      // Mock: 创建对话
      mockConversationRepo.findByFilters.mockResolvedValue([]);
      const mockConversation = {
        id: 'conv-001',
        customerId: 'customer-001',
        messages: [],
      };
      mockUseCases.createConversation.execute.mockResolvedValue(mockConversation);

      // Mock: AgentScope服务
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: '请告诉我具体是什么问题，我会帮您解决。',
          confidence: 0.9,
          agent_name: 'assistant_agent',
        }),
      });

      // Mock: AI服务
      mockAiService.analyzeSentiment.mockResolvedValue({
        overallSentiment: 'negative',
      });
      mockAiService.knowledgeRepository.findByFilters.mockResolvedValue([]);
      mockAiService.detectProblemIntent.mockResolvedValue({
        isProblem: true,
        title: '订单问题',
        intent: 'order_issue',
        confidence: 0.85,
      });
      mockAiService.detectProblemResolution.mockResolvedValue({
        resolved: false,
      });

      // Mock: Problem repository
      mockProblemRepo.findActiveByConversationId.mockResolvedValue(null);
      mockProblemRepo.findLatestResolvedByConversationId.mockResolvedValue(null);

      // Mock: 创建Problem
      mockUseCases.createProblem.execute.mockResolvedValue({
        id: 'problem-001',
        status: 'new',
      });

      // 2. 处理消息
      const result = await coordinator.processCustomerMessage(incomingMessage);

      expect(result.conversationId).toBe('conv-001');
      expect(result.agentSuggestion).toBeDefined();

      // 3. 模拟对话完成
      mockTaskRepo.findByFilters.mockResolvedValue([
        { id: 'task-001', status: 'completed' },
      ]);
      mockAiService.summarizeConversation.mockResolvedValue('问题已解决');

      const completeResult = await coordinator.completeConversation('conv-001');

      expect(completeResult.success).toBe(true);

      // 4. 触发质检
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          quality_score: 90,
          report: { score: 90 },
        }),
      });

      const event = new ConversationClosedEvent(
        { aggregateId: 'conv-001' },
        { resolution: '问题已解决', closedAt: new Date() },
      );
      await coordinator.onConversationClosed(event);

      expect(mockQualityReportRepo.save).toHaveBeenCalled();
    });
  });
});
