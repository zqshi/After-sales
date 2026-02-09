/**
 * ConversationTaskCoordinator 单元测试
 *
 * 测试覆盖：
 * 1. processCustomerMessage - 客户消息处理完整流程
 * 2. completeConversation - 对话完成流程
 * 3. createConversationForRequirement - 为需求创建对话
 * 4. onConversationClosed - 质检触发
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationTaskCoordinator } from '@application/services/ConversationTaskCoordinator';
import type { IncomingMessage } from '@application/services/ConversationTaskCoordinator';
import { Conversation } from '@domain/conversation/models/Conversation';
import { Requirement } from '@domain/requirement/models/Requirement';
import { Task } from '@domain/task/models/Task';
import { ConversationClosedEvent } from '@domain/conversation/events/ConversationClosedEvent';

let agentScopeResponse: any = {
  success: true,
  message: '我们已收到您的问题，会尽快处理。',
  confidence: 0.9,
  agent_name: 'assistant_agent',
  mode: 'auto',
  metadata: {},
};

vi.mock('@infrastructure/agentscope/AgentScopeChatClient', () => ({
  AgentScopeChatClient: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn().mockImplementation(() => agentScopeResponse),
  })),
}));

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

const createMockCreateConversationUseCase = () => ({
  execute: vi.fn(),
});

const createMockCreateRequirementUseCase = () => ({
  execute: vi.fn(),
});

const createMockCreateTaskUseCase = () => ({
  execute: vi.fn(),
});

const createMockCloseConversationUseCase = () => ({
  execute: vi.fn(),
});

const createMockSendMessageUseCase = () => ({
  execute: vi.fn(),
});

const createMockAssociateRequirementWithConversationUseCase = () => ({
  execute: vi.fn(),
});

const createMockCreateProblemUseCase = () => ({
  execute: vi.fn(),
});

const createMockUpdateProblemStatusUseCase = () => ({
  execute: vi.fn(),
});

const createMockCreateReviewRequestUseCase = () => ({
  execute: vi.fn(),
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

const createMockEventBus = () => ({
  publish: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
});

const createMockWorkflowEngine = () => ({
  execute: vi.fn(),
});

// ============================================
// Test Suite
// ============================================

describe('ConversationTaskCoordinator', () => {
  let coordinator: ConversationTaskCoordinator;
  let mockConversationRepo: ReturnType<typeof createMockConversationRepository>;
  let mockTaskRepo: ReturnType<typeof createMockTaskRepository>;
  let mockRequirementRepo: ReturnType<typeof createMockRequirementRepository>;
  let mockProblemRepo: ReturnType<typeof createMockProblemRepository>;
  let mockQualityReportRepo: ReturnType<typeof createMockQualityReportRepository>;
  let mockCreateConversationUseCase: ReturnType<typeof createMockCreateConversationUseCase>;
  let mockCreateRequirementUseCase: ReturnType<typeof createMockCreateRequirementUseCase>;
  let mockCreateTaskUseCase: ReturnType<typeof createMockCreateTaskUseCase>;
  let mockCloseConversationUseCase: ReturnType<typeof createMockCloseConversationUseCase>;
  let mockSendMessageUseCase: ReturnType<typeof createMockSendMessageUseCase>;
  let mockAssociateRequirementUseCase: ReturnType<typeof createMockAssociateRequirementWithConversationUseCase>;
  let mockCreateProblemUseCase: ReturnType<typeof createMockCreateProblemUseCase>;
  let mockUpdateProblemStatusUseCase: ReturnType<typeof createMockUpdateProblemStatusUseCase>;
  let mockCreateReviewRequestUseCase: ReturnType<typeof createMockCreateReviewRequestUseCase>;
  let mockAiService: ReturnType<typeof createMockAiService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockWorkflowEngine: ReturnType<typeof createMockWorkflowEngine>;

  beforeEach(() => {
    agentScopeResponse = {
      success: true,
      message: '我们已收到您的问题，会尽快处理。',
      confidence: 0.9,
      agent_name: 'assistant_agent',
      mode: 'auto',
      metadata: {},
    };

    // 重置所有mocks
    mockConversationRepo = createMockConversationRepository();
    mockTaskRepo = createMockTaskRepository();
    mockRequirementRepo = createMockRequirementRepository();
    mockProblemRepo = createMockProblemRepository();
    mockQualityReportRepo = createMockQualityReportRepository();
    mockCreateConversationUseCase = createMockCreateConversationUseCase();
    mockCreateRequirementUseCase = createMockCreateRequirementUseCase();
    mockCreateTaskUseCase = createMockCreateTaskUseCase();
    mockCloseConversationUseCase = createMockCloseConversationUseCase();
    mockSendMessageUseCase = createMockSendMessageUseCase();
    mockAssociateRequirementUseCase = createMockAssociateRequirementWithConversationUseCase();
    mockCreateProblemUseCase = createMockCreateProblemUseCase();
    mockUpdateProblemStatusUseCase = createMockUpdateProblemStatusUseCase();
    mockCreateReviewRequestUseCase = createMockCreateReviewRequestUseCase();
    mockAiService = createMockAiService();
    mockEventBus = createMockEventBus();
    mockWorkflowEngine = createMockWorkflowEngine();

    // 创建coordinator实例
    coordinator = new ConversationTaskCoordinator(
      mockConversationRepo as any,
      mockTaskRepo as any,
      mockRequirementRepo as any,
      mockProblemRepo as any,
      mockCreateConversationUseCase as any,
      mockCreateRequirementUseCase as any,
      mockCreateTaskUseCase as any,
      mockCloseConversationUseCase as any,
      mockSendMessageUseCase as any,
      mockAssociateRequirementUseCase as any,
      mockCreateProblemUseCase as any,
      mockUpdateProblemStatusUseCase as any,
      mockCreateReviewRequestUseCase as any,
      mockAiService as any,
      mockEventBus as any,
      mockQualityReportRepo as any,
      { save: async () => ({}) } as any,
      mockWorkflowEngine as any,
    );
    mockCreateReviewRequestUseCase.execute.mockResolvedValue({ id: 'review-001' });
  });

  // ============================================
  // processCustomerMessage 测试
  // ============================================

  describe('processCustomerMessage', () => {
    it('应该为新客户创建新对话', async () => {
      agentScopeResponse = {
        success: true,
        message: '您好，很高兴为您服务。',
        confidence: 0.9,
        agent_name: 'assistant_agent',
        mode: 'auto',
        metadata: {},
      };

      const incomingMessage: IncomingMessage = {
        customerId: 'customer-001',
        content: '你好，我想咨询一下',
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
      mockCreateConversationUseCase.execute.mockResolvedValue(mockConversation);

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

      expect(result.conversationId).toBe('conv-001');
      expect(mockCreateConversationUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-001',
          channel: 'web',
        }),
      );
    });

    it('应该使用现有对话并添加新消息', async () => {
      agentScopeResponse = {
        success: true,
        message: '好的，请继续描述问题。',
        confidence: 0.9,
        agent_name: 'assistant_agent',
        mode: 'auto',
        metadata: {},
      };

      const incomingMessage: IncomingMessage = {
        customerId: 'customer-001',
        content: '我还有问题',
        channel: 'web',
        senderId: 'user-001',
      };

      // Mock: 存在活跃对话
      const existingConversation = {
        id: 'conv-001',
        customerId: 'customer-001',
        status: 'open',
        messages: [],
      };
      mockConversationRepo.findByFilters.mockResolvedValue([existingConversation]);
      mockConversationRepo.findById.mockResolvedValue(existingConversation);

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

      expect(result.conversationId).toBe('conv-001');
      expect(mockSendMessageUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-001',
          content: '我还有问题',
        }),
      );
      expect(mockCreateConversationUseCase.execute).not.toHaveBeenCalled();
    });

    it('应该检测并创建高置信度需求', async () => {
      agentScopeResponse = {
        success: true,
        message: '我们会评估您的需求。',
        confidence: 0.9,
        agent_name: 'assistant_agent',
        mode: 'auto',
        metadata: {},
      };

      const incomingMessage: IncomingMessage = {
        customerId: 'customer-001',
        content: '我需要添加一个新功能',
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
      mockCreateConversationUseCase.execute.mockResolvedValue(mockConversation);

      // Mock: 创建需求
      const mockRequirement = {
        id: 'req-001',
        title: '添加一个新功能',
      };
      mockCreateRequirementUseCase.execute.mockResolvedValue(mockRequirement);

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

      expect(result.requirementsCreated.length).toBeGreaterThan(0);
      expect(mockCreateRequirementUseCase.execute).toHaveBeenCalled();
    });

    it('应该为高优先级需求自动创建Task', async () => {
      agentScopeResponse = {
        success: true,
        message: '已记录为紧急问题，会优先处理。',
        confidence: 0.9,
        agent_name: 'assistant_agent',
        mode: 'auto',
        metadata: {},
      };

      const incomingMessage: IncomingMessage = {
        customerId: 'customer-001',
        content: '紧急：我需要修复一个严重bug',
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
      mockCreateConversationUseCase.execute.mockResolvedValue(mockConversation);

      // Mock: 创建需求
      const mockRequirement = {
        id: 'req-001',
        title: '修复严重bug',
      };
      mockCreateRequirementUseCase.execute.mockResolvedValue(mockRequirement);

      // Mock: 创建任务
      const mockTask = {
        id: 'task-001',
        title: '处理需求: 修复严重bug',
      };
      mockCreateTaskUseCase.execute.mockResolvedValue(mockTask);

      // Mock: AI服务
      mockAiService.analyzeSentiment.mockResolvedValue({
        overallSentiment: 'negative',
      });
      mockAiService.knowledgeRepository.findByFilters.mockResolvedValue([]);
      mockAiService.detectProblemIntent.mockResolvedValue({
        isProblem: true,
        title: '严重bug',
        intent: 'bug_report',
        confidence: 0.9,
      });
      mockAiService.detectProblemResolution.mockResolvedValue({
        resolved: false,
      });

      // Mock: Problem repository
      mockProblemRepo.findActiveByConversationId.mockResolvedValue(null);
      mockProblemRepo.findLatestResolvedByConversationId.mockResolvedValue(null);

      // Mock: 创建Problem
      const mockProblem = {
        id: 'problem-001',
        status: 'new',
      };
      mockCreateProblemUseCase.execute.mockResolvedValue(mockProblem);

      const result = await coordinator.processCustomerMessage(incomingMessage);

      expect(result.tasksCreated.length).toBeGreaterThan(0);
      expect(mockCreateTaskUseCase.execute).toHaveBeenCalled();
    });

    it('应该在低置信度时要求人工审核', async () => {
      agentScopeResponse = {
        success: false,
      };

      const incomingMessage: IncomingMessage = {
        customerId: 'customer-001',
        content: '这个问题比较复杂',
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
      mockCreateConversationUseCase.execute.mockResolvedValue(mockConversation);

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
      const mockReviewRequest = {
        id: 'review-001',
      };
      mockCreateReviewRequestUseCase.execute.mockResolvedValue(mockReviewRequest);

      const result = await coordinator.processCustomerMessage(incomingMessage);

      expect(result.status).toBe('needs_review');
      expect(result.agentSuggestion?.needsHumanReview).toBe(true);
      expect(mockCreateReviewRequestUseCase.execute).toHaveBeenCalled();
    });

    it('应该处理AgentScope服务返回的回复', async () => {
      agentScopeResponse = {
        success: true,
        message: '您好，请问有什么可以帮您？',
        confidence: 0.95,
        agent_name: 'assistant_agent',
        mode: 'auto',
        metadata: {},
      };

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
      mockCreateConversationUseCase.execute.mockResolvedValue(mockConversation);

      // Mock: AI服务
      mockAiService.analyzeSentiment.mockResolvedValue({
        overallSentiment: 'positive',
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
    });
  });

  // ============================================
  // completeConversation 测试
  // ============================================

  describe('completeConversation', () => {
    it('应该在所有Task完成后关闭对话', async () => {
      const conversationId = 'conv-001';

      // Mock: 所有Task都已完成
      const completedTasks = [
        { id: 'task-001', status: 'completed' },
        { id: 'task-002', status: 'completed' },
      ];
      mockTaskRepo.findByFilters.mockResolvedValue(completedTasks);

      // Mock: AI生成总结
      mockAiService.summarizeConversation.mockResolvedValue('对话已成功完成');

      const result = await coordinator.completeConversation(conversationId);

      expect(result.success).toBe(true);
      expect(result.summary).toBe('对话已成功完成');
      expect(result.incompleteTasks).toHaveLength(0);
      expect(mockCloseConversationUseCase.execute).not.toHaveBeenCalled();
    });

    it('应该在有未完成Task时拒绝关闭对话', async () => {
      const conversationId = 'conv-001';

      // Mock: 有未完成的Task
      const tasks = [
        { id: 'task-001', status: 'completed' },
        { id: 'task-002', status: 'in_progress' },
        { id: 'task-003', status: 'pending' },
      ];
      mockTaskRepo.findByFilters.mockResolvedValue(tasks);

      const result = await coordinator.completeConversation(conversationId);

      expect(result.success).toBe(false);
      expect(result.incompleteTasks).toHaveLength(2);
      expect(result.incompleteTasks).toContain('task-002');
      expect(result.incompleteTasks).toContain('task-003');
      expect(mockCloseConversationUseCase.execute).not.toHaveBeenCalled();
    });

    it('应该忽略已取消的Task', async () => {
      const conversationId = 'conv-001';

      // Mock: 有已取消的Task
      const tasks = [
        { id: 'task-001', status: 'completed' },
        { id: 'task-002', status: 'cancelled' },
      ];
      mockTaskRepo.findByFilters.mockResolvedValue(tasks);

      // Mock: AI生成总结
      mockAiService.summarizeConversation.mockResolvedValue('对话已完成');

      const result = await coordinator.completeConversation(conversationId);

      expect(result.success).toBe(true);
      expect(result.incompleteTasks).toHaveLength(0);
    });
  });

  // ============================================
  // createConversationForRequirement 测试
  // ============================================

  describe('createConversationForRequirement', () => {
    it('应该为高优先级需求创建对话', async () => {
      const requirementId = 'req-001';

      // Mock: 高优先级需求
      const mockRequirement = {
        id: requirementId,
        customerId: 'customer-001',
        title: '紧急需求',
        priority: { value: 'high' },
        source: { value: 'manual' },
        category: 'technical',
      };
      mockRequirementRepo.findById.mockResolvedValue(mockRequirement);

      // Mock: 创建对话
      const mockConversation = {
        id: 'conv-001',
        customerId: 'customer-001',
      };
      mockCreateConversationUseCase.execute.mockResolvedValue(mockConversation);

      const result = await coordinator.createConversationForRequirement(requirementId);

      expect(result.needsCustomerCommunication).toBe(true);
      expect(result.conversationId).toBe('conv-001');
      expect(mockCreateConversationUseCase.execute).toHaveBeenCalled();
      expect(mockAssociateRequirementUseCase.execute).toHaveBeenCalledWith({
        requirementId,
        conversationId: 'conv-001',
      });
    });

    it('应该跳过来自对话的需求', async () => {
      const requirementId = 'req-001';

      // Mock: 来自对话的需求
      const mockRequirement = {
        id: requirementId,
        customerId: 'customer-001',
        title: '对话需求',
        priority: { value: 'medium' },
        source: { value: 'conversation' },
      };
      mockRequirementRepo.findById.mockResolvedValue(mockRequirement);

      const result = await coordinator.createConversationForRequirement(requirementId);

      expect(result.needsCustomerCommunication).toBe(false);
      expect(result.conversationId).toBeUndefined();
      expect(mockCreateConversationUseCase.execute).not.toHaveBeenCalled();
    });

    it('应该为技术类需求创建对话', async () => {
      const requirementId = 'req-001';

      // Mock: 技术类需求
      const mockRequirement = {
        id: requirementId,
        customerId: 'customer-001',
        title: '技术需求',
        priority: { value: 'medium' },
        source: { value: 'manual' },
        category: 'technical',
      };
      mockRequirementRepo.findById.mockResolvedValue(mockRequirement);

      // Mock: 创建对话
      const mockConversation = {
        id: 'conv-001',
        customerId: 'customer-001',
      };
      mockCreateConversationUseCase.execute.mockResolvedValue(mockConversation);

      const result = await coordinator.createConversationForRequirement(requirementId);

      expect(result.needsCustomerCommunication).toBe(true);
      expect(result.conversationId).toBe('conv-001');
    });

    it('应该在需求不存在时抛出错误', async () => {
      const requirementId = 'non-existent';

      // Mock: 需求不存在
      mockRequirementRepo.findById.mockResolvedValue(null);

      await expect(
        coordinator.createConversationForRequirement(requirementId),
      ).rejects.toThrow('Requirement non-existent not found');
    });
  });

  // ============================================
  // onConversationClosed 测试
  // ============================================

  describe('onConversationClosed', () => {
    it('应该触发质检流程', async () => {
      const event = new ConversationClosedEvent(
        { aggregateId: 'conv-001' },
        { resolution: '对话已完成', closedAt: new Date() },
      );

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          quality_score: 85,
          report: {
            score: 85,
            feedback: '服务质量良好',
          },
        }),
      });

      await coordinator.onConversationClosed(event);

      expect(global.fetch).toHaveBeenCalled();
      expect(mockQualityReportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-001',
          qualityScore: 85,
        }),
      );
    });

    it('应该处理质检API失败', async () => {
      const event = new ConversationClosedEvent(
        { aggregateId: 'conv-001' },
        { resolution: '对话已完成', closedAt: new Date() },
      );

      // Mock fetch失败
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      // 不应该抛出错误
      await expect(coordinator.onConversationClosed(event)).resolves.not.toThrow();
    });

    it('应该处理缺少conversationId的事件', async () => {
      const event = {
        aggregateId: undefined,
        conversationId: undefined,
      } as any;

      global.fetch = vi.fn();

      // 不应该抛出错误
      await expect(coordinator.onConversationClosed(event)).resolves.not.toThrow();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
