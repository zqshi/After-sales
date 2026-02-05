import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { ImController } from '@presentation/http/controllers/ImController';
import { WorkflowRegistry } from '@infrastructure/workflow/WorkflowRegistry';
import { QualityReportRepository } from '@infrastructure/repositories/QualityReportRepository';

const createReply = () => {
  const reply: any = {
    statusCode: 200,
    payload: undefined,
    code(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: any) {
      this.payload = payload;
      return this;
    },
  };
  return reply;
};

describe('ImController', () => {
  let coordinator: any;
  let aiService: any;
  let searchKnowledgeUseCase: any;
  let taskRepository: any;
  let conversationRepository: any;
  let customerProfileRepository: any;
  let sendMessageUseCase: any;
  let reviewRequestRepository: any;
  let completeReviewRequestUseCase: any;
  let createTaskUseCase: any;
  let problemRepository: any;

  const makeController = () =>
    new ImController(
      coordinator,
      aiService,
      searchKnowledgeUseCase,
      taskRepository,
      conversationRepository,
      customerProfileRepository,
      sendMessageUseCase,
      reviewRequestRepository,
      completeReviewRequestUseCase,
      createTaskUseCase,
      problemRepository,
    );

  beforeEach(() => {
    coordinator = {
      processCustomerMessage: vi.fn(),
    };
    aiService = {
      analyzeSentiment: vi.fn(),
      analyzeConversation: vi.fn(),
      llmClient: {
        isEnabled: vi.fn().mockReturnValue(true),
        extractIntent: vi.fn(),
        generateReply: vi.fn(),
      },
    };
    searchKnowledgeUseCase = {
      execute: vi.fn(),
    };
    taskRepository = {
      findByFilters: vi.fn(),
    };
    conversationRepository = {
      findById: vi.fn(),
      findByFilters: vi.fn(),
      countByFilters: vi.fn(),
      save: vi.fn(),
      deleteByChannel: vi.fn(),
      deleteByCustomerId: vi.fn(),
      dataSource: {
        getRepository: vi.fn().mockReturnValue({
          findOne: vi.fn(),
          createQueryBuilder: vi.fn(),
        }),
      },
    };
    customerProfileRepository = {
      findById: vi.fn(),
      findInteractions: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
    };
    sendMessageUseCase = { execute: vi.fn() };
    reviewRequestRepository = { create: vi.fn(), findById: vi.fn(), findByFilters: vi.fn() };
    completeReviewRequestUseCase = { execute: vi.fn() };
    createTaskUseCase = { execute: vi.fn() };
    problemRepository = {
      findByConversationId: vi.fn(),
      findByFilters: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (WorkflowRegistry as any).engine = undefined;
    (WorkflowRegistry as any).humanExecutor = undefined;
  });

  it('should return 400 when missing params', async () => {
    const controller = makeController();
    const reply = createReply();
    const request: any = {
      body: {
        customerId: '',
        content: 'hi',
        channel: 'web',
        senderId: 's1',
      },
    };

    await controller.handleIncomingMessage(request, reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.payload.success).toBe(false);
  });

  it('should handle incoming message and assemble response', async () => {
    const controller = makeController();
    const reply = createReply();

    coordinator.processCustomerMessage.mockResolvedValue({
      conversationId: 'conv-1',
      agentSuggestion: {
        suggestedReply: '建议回复',
        confidence: 0.8,
        needsHumanReview: false,
        reason: 'ok',
        agentName: 'bot',
        mode: 'auto',
        reviewRequestId: 'rr-1',
      },
      status: 'ok',
    });

    aiService.analyzeSentiment.mockResolvedValue({
      overallSentiment: 'neutral',
      score: 0.6,
      confidence: 0.7,
    });

    aiService.llmClient.extractIntent.mockResolvedValue({
      keywords: ['登录'],
    });

    searchKnowledgeUseCase.execute.mockResolvedValue([
      { id: 'k1', title: '登录问题处理', category: 'faq', tags: ['登录'] },
    ]);

    taskRepository.findByFilters.mockResolvedValue([
      { id: 't1', title: '跟进', priority: { value: 'high' } },
    ]);

    conversationRepository.findById.mockResolvedValue({
      id: 'conv-1',
      messages: [
        {
          id: 'm1',
          senderType: 'customer',
          content: '无法登录',
          sentAt: new Date('2024-01-01T00:00:00Z'),
        },
      ],
    });

    const request: any = {
      body: {
        customerId: 'c1',
        content: '无法登录',
        channel: 'web',
        senderId: 's1',
      },
    };

    await controller.handleIncomingMessage(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.success).toBe(true);
    expect(reply.payload.data.analysis.knowledgeRecommendations.length).toBe(1);
    expect(reply.payload.data.analysis.relatedTasks.length).toBe(1);
  });

  it('filters knowledge recommendations by relevance score', async () => {
    const controller = makeController();
    const reply = createReply();

    coordinator.processCustomerMessage.mockResolvedValue({
      conversationId: 'conv-score',
      agentSuggestion: null,
      status: 'ok',
    });
    conversationRepository.findById.mockResolvedValue({
      id: 'conv-score',
      messages: [],
    });
    aiService.analyzeSentiment.mockResolvedValue({
      overallSentiment: 'neutral',
      score: 0.5,
      confidence: 0.6,
    });
    aiService.llmClient.extractIntent.mockResolvedValue({ keywords: ['登录'] });

    searchKnowledgeUseCase.execute.mockResolvedValue([
      { id: 'k1', title: '登录失败处理', category: 'faq', tags: ['登录'] },
      { id: 'k2', title: '退款流程说明', category: 'billing', tags: ['退款'] },
    ]);
    taskRepository.findByFilters.mockResolvedValue([]);

    const request: any = {
      body: {
        customerId: 'c1',
        content: '无法登录',
        channel: 'web',
        senderId: 's1',
      },
    };

    await controller.handleIncomingMessage(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.analysis.knowledgeRecommendations.length).toBe(1);
    expect(reply.payload.data.analysis.knowledgeRecommendations[0].id).toBe('k1');
  });

  it('handles intent extraction failure and falls back to raw query', async () => {
    const controller = makeController();
    const reply = createReply();

    coordinator.processCustomerMessage.mockResolvedValue({
      conversationId: 'conv-fallback',
      agentSuggestion: null,
      status: 'ok',
    });
    conversationRepository.findById.mockResolvedValue({
      id: 'conv-fallback',
      messages: [],
    });
    aiService.analyzeSentiment.mockResolvedValue({
      overallSentiment: 'neutral',
      score: 0.5,
      confidence: 0.6,
    });
    aiService.llmClient.extractIntent.mockRejectedValue(new Error('llm down'));
    searchKnowledgeUseCase.execute.mockResolvedValue([]);
    taskRepository.findByFilters.mockResolvedValue([]);

    const request: any = {
      body: {
        customerId: 'c1',
        content: '无法登录',
        channel: 'web',
        senderId: 's1',
      },
    };

    await controller.handleIncomingMessage(request, reply);

    expect(searchKnowledgeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ query: '无法登录' }),
    );
    expect(reply.statusCode).toBe(200);
  });

  it('maps sender name for agent messages without sentiment', async () => {
    const controller = makeController();
    const reply = createReply();

    conversationRepository.findById.mockResolvedValue({
      id: 'conv-3',
      customerId: 'cust-1',
      metadata: { groupMemberMap: { u1: 'Alice' } },
      messages: [
        {
          id: 'm1',
          senderType: 'agent',
          senderId: 'a1',
          content: 'hello',
          sentAt: new Date('2024-01-01T00:00:00Z'),
          metadata: { senderName: '客服A' },
        },
      ],
    });
    customerProfileRepository.findById.mockResolvedValue({ name: '客户A' });

    await controller.getConversationMessages({ params: { id: 'conv-3' }, query: {} } as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.messages[0].senderName).toBe('客服A');
    expect(reply.payload.data.messages[0].sentiment).toBeUndefined();
  });

  it('returns conversations without problem flags when includeProblem disabled', async () => {
    const controller = makeController();
    const reply = createReply();

    conversationRepository.findByFilters.mockResolvedValue([
      {
        id: 'c1',
        customerId: 'cust-1',
        channel: { value: 'web' },
        status: 'open',
        mode: 'auto',
        priority: 'normal',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        messages: [],
        metadata: {},
      },
    ]);
    conversationRepository.countByFilters.mockResolvedValue(1);
    customerProfileRepository.findById.mockResolvedValue({ name: '客户A', isVIP: false });

    await controller.getConversations({ query: { channel: 'web' } } as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.conversations[0].isProblem).toBeNull();
  });

  it('should filter conversations by wecom membership and include problem info', async () => {
    const controller = makeController();
    const reply = createReply();

    const conversationList = [
      {
        id: 'c1',
        customerId: 'cust-1',
        channel: { value: 'wecom' },
        status: 'open',
        mode: 'auto',
        priority: 'high',
        agentId: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        metadata: { groupMembers: ['Bob'] },
        messages: [
          {
            senderType: 'customer',
            content: '报错无法使用',
            sentAt: new Date('2024-01-02T00:00:00Z'),
            metadata: {},
          },
        ],
      },
      {
        id: 'c2',
        customerId: 'cust-2',
        channel: { value: 'wecom' },
        status: 'open',
        mode: 'auto',
        priority: 'normal',
        agentId: 'a1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        metadata: { groupMembers: ['Alice'] },
        messages: [
          {
            senderType: 'customer',
            content: '请帮忙看看',
            sentAt: new Date('2024-01-02T00:00:00Z'),
            metadata: { senderId: 'u1' },
          },
        ],
      },
    ];

    conversationRepository.findByFilters
      .mockResolvedValueOnce([conversationList[0]])
      .mockResolvedValueOnce(conversationList);
    conversationRepository.countByFilters.mockResolvedValue(2);

    customerProfileRepository.findById.mockResolvedValue({ name: '客户', isVIP: false });

    aiService.llmClient.extractIntent.mockResolvedValue({
      confidence: 0.7,
      isQuestion: false,
      intent: 'complaint',
    });

    const request: any = {
      query: {
        channel: 'wecom',
        includeProblem: 'true',
      },
      user: { name: 'Alice' },
    };

    await controller.getConversations(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.conversations.length).toBe(1);
    expect(reply.payload.data.conversations[0].id).toBe('c2');
    expect(reply.payload.data.conversations[0].isProblem).toBe(true);
  });

  it('should return conversation stats with filters', async () => {
    const controller = makeController();
    const reply = createReply();

    const conversations = [
      {
        id: 'c1',
        customerId: 'cust-1',
        channel: { value: 'web' },
        status: 'open',
        mode: 'auto',
        priority: 'high',
        agentId: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        metadata: {},
        messages: [
          {
            senderType: 'customer',
            content: '问题还没解决',
            sentAt: new Date('2024-01-02T00:00:00Z'),
            metadata: {},
          },
        ],
      },
      {
        id: 'c2',
        customerId: 'cust-2',
        channel: { value: 'web' },
        status: 'open',
        mode: 'auto',
        priority: 'low',
        agentId: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        metadata: {},
        messages: [
          {
            senderType: 'customer',
            content: '谢谢已解决',
            sentAt: new Date('2024-01-02T00:00:00Z'),
            metadata: {},
          },
        ],
      },
    ];

    conversationRepository.countByFilters.mockResolvedValue(2);
    conversationRepository.findByFilters.mockResolvedValue(conversations);
    customerProfileRepository.findById
      .mockResolvedValueOnce({ name: '客户1', isVIP: true })
      .mockResolvedValueOnce({ name: '客户2', isVIP: false, slaInfo: { serviceLevel: '普通' } });

    aiService.llmClient.extractIntent.mockResolvedValue({
      confidence: 0.7,
      isQuestion: true,
      intent: 'request',
    });

    const request: any = {
      query: { channel: 'web', urgency: 'high', sla: 'vip' },
    };

    await controller.getConversationStats(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.statusCounts.all).toBe(1);
    expect(reply.payload.data.statusCounts.pending).toBe(1);
  });

  it('should return 404 when conversation not found for messages', async () => {
    const controller = makeController();
    const reply = createReply();
    conversationRepository.findById.mockResolvedValue(null);

    const request: any = { params: { id: 'missing' }, query: {} };
    await controller.getConversationMessages(request, reply);

    expect(reply.statusCode).toBe(404);
    expect(reply.payload.success).toBe(false);
  });

  it('should list conversation messages with sentiment and sender mapping', async () => {
    const controller = makeController();
    const reply = createReply();

    conversationRepository.findById.mockResolvedValue({
      id: 'conv-2',
      customerId: 'cust-1',
      metadata: { groupMemberMap: { u1: 'Alice' } },
      messages: [
        {
          id: 'm1',
          senderType: 'customer',
          senderId: 'u1',
          content: '无法登录',
          sentAt: new Date('2024-01-01T00:00:00Z'),
          metadata: { senderId: 'u1' },
        },
        {
          id: 'm2',
          senderType: 'agent',
          senderId: 'a1',
          content: '好的',
          sentAt: new Date('2024-01-01T01:00:00Z'),
          metadata: { senderName: '客服张三' },
        },
      ],
    });

    customerProfileRepository.findById.mockResolvedValue({ name: '客户A' });
    aiService.analyzeSentiment.mockResolvedValue({
      overallSentiment: 'negative',
      score: 0.3,
      confidence: 0.6,
      emotions: ['不满'],
      reasoning: 'mock',
    });

    const request: any = { params: { id: 'conv-2' }, query: { limit: 1, offset: 0 } };
    await controller.getConversationMessages(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.total).toBe(2);
    expect(reply.payload.data.messages[0].senderName).toBe('Alice');
    expect(reply.payload.data.messages[0].sentiment.emotion).toBe('negative');
  });

  it('should return 400 when sending empty message', async () => {
    const controller = makeController();
    const reply = createReply();

    const request: any = { params: { id: 'conv-3' }, body: { content: '' } };
    await controller.sendMessage(request, reply);

    expect(reply.statusCode).toBe(400);
  });

  it('should return 404 when sending message to missing conversation', async () => {
    const controller = makeController();
    const reply = createReply();
    conversationRepository.findById.mockResolvedValue(null);

    const request: any = { params: { id: 'conv-3' }, body: { content: 'hi' } };
    await controller.sendMessage(request, reply);

    expect(reply.statusCode).toBe(404);
  });

  it('should assign agent and send message', async () => {
    const controller = makeController();
    const reply = createReply();
    const assignAgent = vi.fn();
    const save = vi.fn();

    conversationRepository.findById.mockResolvedValue({
      id: 'conv-4',
      agentId: null,
      customerId: 'cust-4',
      assignAgent,
    });
    conversationRepository.save = save;

    sendMessageUseCase.execute.mockResolvedValue({
      messageId: 'm9',
      conversationId: 'conv-4',
      timestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
      message: {
        content: 'hello',
        senderType: 'internal',
        senderId: 'agent-1',
      },
    });

    const request: any = {
      params: { id: 'conv-4' },
      body: { content: 'hello' },
      user: { sub: 'agent-1' },
    };
    await controller.sendMessage(request, reply);

    expect(assignAgent).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.id).toBe('m9');
  });

  it('should submit agent review and create tasks', async () => {
    const controller = makeController();
    const reply = createReply();

    reviewRequestRepository.findById.mockResolvedValue({
      id: 'review-1',
      conversationId: 'conv-1',
      suggestion: {
        executionId: 'exec-1',
        stepName: 'step-1',
        recommendedTasks: [
          { title: '任务1', priority: 'high' },
          { title: '', priority: 'low' },
        ],
      },
    });
    completeReviewRequestUseCase.execute.mockResolvedValue({});
    createTaskUseCase.execute.mockResolvedValue({ id: 'task-1' });

    const submitSpy = vi.spyOn(WorkflowRegistry, 'submitHumanResponse');

    const request: any = {
      body: {
        reviewId: 'review-1',
        status: 'approved',
        reviewerNote: 'ok',
      },
      user: { sub: 'agent-1' },
    };

    await controller.submitAgentReview(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.tasksCreated).toEqual(['task-1']);
    expect(submitSpy).toHaveBeenCalled();
  });

  it('should return pending reviews from workflow engine when available', async () => {
    const controller = makeController();
    const reply = createReply();

    (WorkflowRegistry as any).engine = {
      getPendingHumanReviews: vi.fn().mockReturnValue([
        {
          executionId: 'exec-2',
          workflowName: 'flow',
          stepName: 'step',
          requestedAt: new Date('2024-01-01T00:00:00Z'),
          timeout: 1000,
          data: { foo: 'bar' },
        },
      ]),
    };

    await controller.getPendingReviews({} as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.pending.length).toBe(1);
    expect(reply.payload.data.pending[0].executionId).toBe('exec-2');
  });

  it('should return pending reviews from repository when engine empty', async () => {
    const controller = makeController();
    const reply = createReply();

    reviewRequestRepository.findByFilters.mockResolvedValue([
      {
        id: 'r1',
        conversationId: 'c1',
        status: 'pending',
        suggestion: {},
        confidence: 0.6,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      },
    ]);

    await controller.getPendingReviews({} as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.pending[0].reviewId).toBe('r1');
  });

  it('should list conversation problems', async () => {
    const controller = makeController();
    const reply = createReply();
    problemRepository.findByFilters.mockResolvedValue([
      {
        id: 'p1',
        conversationId: 'c1',
        customerId: 'cust',
        title: '问题',
        description: '描述',
        status: 'open',
        intent: 'complaint',
        confidence: 0.7,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      },
    ]);

    const request: any = { params: { id: 'c1' } };
    await controller.getConversationProblems(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.problems[0].id).toBe('p1');
  });

  it('should reject closing IM conversation status', async () => {
    const controller = makeController();
    const reply = createReply();
    conversationRepository.findById.mockResolvedValue({
      id: 'c1',
      channel: { value: 'wecom' },
    });

    const request: any = { params: { id: 'c1' }, body: { status: 'closed' } };
    await controller.updateConversationStatus(request, reply);

    expect(reply.statusCode).toBe(400);
  });

  it('should update conversation status', async () => {
    const controller = makeController();
    const reply = createReply();
    const updateStatus = vi.fn();
    const conversation = {
      id: 'c2',
      status: 'open',
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      channel: { value: 'web' },
      updateStatus,
    };
    conversationRepository.findById.mockResolvedValue(conversation);

    const request: any = { params: { id: 'c2' }, body: { status: 'pending' } };
    await controller.updateConversationStatus(request, reply);

    expect(updateStatus).toHaveBeenCalled();
    expect(conversationRepository.save).toHaveBeenCalled();
    expect(reply.statusCode).toBe(200);
  });

  it('should fetch customer profile', async () => {
    const controller = makeController();
    const reply = createReply();

    customerProfileRepository.findById.mockResolvedValue({
      customerId: 'cust-1',
      name: '客户A',
      contactInfo: {
        email: 'a@example.com',
        phone: '123',
        address: 'addr',
        preferredChannel: 'web',
      },
      slaInfo: {
        serviceLevel: 'VIP',
        responseTimeTargetMinutes: 30,
        resolutionTimeTargetMinutes: 120,
        lastReviewedAt: new Date('2024-01-01T00:00:00Z'),
      },
      metrics: {
        satisfactionScore: 90,
        issueCount: 1,
        averageResolutionMinutes: 60,
        lastUpdated: new Date('2024-01-01T00:00:00Z'),
      },
      insights: [],
      interactions: [],
      serviceRecords: [],
      commitments: [],
      isVIP: true,
      riskLevel: 'low',
      calculateHealthScore: () => 88,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    });
    const request: any = { params: { customerId: 'cust-1' } };
    await controller.getCustomerProfile(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.success).toBe(true);
  });

  it('should fetch customer interactions', async () => {
    const controller = makeController();
    const reply = createReply();
    customerProfileRepository.findInteractions.mockResolvedValue([{ id: 'i1' }]);

    const request: any = { params: { customerId: 'cust-1' }, query: { range: '7d' } };
    await controller.getCustomerInteractions(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.total).toBe(1);
  });

  it('should return quality from latest report when available', async () => {
    const controller = makeController();
    const reply = createReply();
    const reportSpy = vi
      .spyOn(QualityReportRepository.prototype, 'findLatestByConversationId')
      .mockResolvedValueOnce({
        qualityScore: 88,
        report: { summary: 'ok' },
        createdAt: new Date('2024-01-01T00:00:00Z'),
      } as any);

    const request: any = { params: { conversationId: 'c1' } };
    await controller.getConversationQuality(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.quality.score).toBe(88);
    reportSpy.mockRestore();
  });

  it('should return conversation ai analysis with recommendations', async () => {
    const controller = makeController();
    const reply = createReply();
    conversationRepository.findById.mockResolvedValue({
      id: 'conv-ai',
      customerId: 'cust',
      priority: 'high',
      channel: { value: 'web' },
      messages: [
        {
          senderType: 'customer',
          content: '无法登录',
          sentAt: new Date('2024-01-01T00:00:00Z'),
          metadata: { issueProduct: 'login' },
        },
      ],
      metadata: {},
    });
    searchKnowledgeUseCase.execute.mockResolvedValue([
      { id: 'k1', title: '登录说明', category: 'faq', score: 0.9 },
    ]);
    taskRepository.findByFilters.mockResolvedValue([
      { id: 't1', title: '处理任务', priority: { value: 'high' } },
    ]);
    aiService.analyzeSentiment.mockResolvedValue({
      overallSentiment: 'negative',
      score: 0.3,
      confidence: 0.6,
    });
    aiService.analyzeConversation.mockResolvedValue({
      issues: [{ type: 'response', description: 'slow', severity: 'low' }],
      improvementSuggestions: ['加快响应'],
    });
    aiService.llmClient.extractIntent.mockResolvedValue({ keywords: ['登录'] });
    aiService.llmClient.generateReply.mockResolvedValue({
      suggestedReply: '请稍后再试',
      confidence: 0.7,
      reasoning: 'ok',
    });

    const request: any = { params: { id: 'conv-ai' } };
    await controller.getConversationAiAnalysis(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.knowledgeRecommendations.length).toBe(1);
    expect(reply.payload.data.replySuggestion.suggestedReply).toBe('请稍后再试');
  });

  it('should set conversation mode for existing conversation', async () => {
    const controller = makeController();
    const reply = createReply();
    const setMode = vi.fn();
    const conversation = {
      id: 'c1',
      mode: 'agent_auto',
      setMode,
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    };
    conversationRepository.findById.mockResolvedValue(conversation);

    const request: any = {
      params: { id: 'c1' },
      body: { mode: 'agent_supervised' },
    };
    await controller.setConversationMode(request, reply);

    expect(setMode).toHaveBeenCalled();
    expect(conversationRepository.save).toHaveBeenCalled();
    expect(reply.statusCode).toBe(200);
  });

  it('should return default sentiment when conversation missing', async () => {
    const controller = makeController();
    const reply = createReply();
    conversationRepository.findById.mockResolvedValue(null);

    const request: any = { params: { id: 'missing' } };
    await controller.getConversationSentiment(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.sentiment.type).toBe('neutral');
  });

  it('should return sentiment from recent external messages', async () => {
    const controller = makeController();
    const reply = createReply();
    conversationRepository.findById.mockResolvedValue({
      id: 'c-sent',
      messages: [
        { senderType: 'internal', content: 'hi' },
        { senderType: 'external', content: '谢谢', sentAt: new Date('2024-01-01T00:00:00Z') },
      ],
    });
    aiService.analyzeSentiment.mockResolvedValue({
      overallSentiment: 'positive',
      score: 0.8,
      confidence: 0.9,
      emotions: ['感谢'],
    });

    const request: any = { params: { id: 'c-sent' } };
    await controller.getConversationSentiment(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.sentiment.type).toBe('positive');
  });

  it('should return 400 when submitAgentReview missing params', async () => {
    const controller = makeController();
    const reply = createReply();

    await controller.submitAgentReview({ body: {} } as any, reply);

    expect(reply.statusCode).toBe(400);
  });

  it('should return 404 when review not found', async () => {
    const controller = makeController();
    const reply = createReply();
    reviewRequestRepository.findById.mockResolvedValue(null);

    await controller.submitAgentReview(
      { body: { reviewId: 'missing', status: 'approved' } } as any,
      reply,
    );

    expect(reply.statusCode).toBe(404);
  });

  it('should list conversation quality reports', async () => {
    const controller = makeController();
    const reply = createReply();
    const qb = {
      where: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          id: 'qr-1',
          qualityScore: 77,
          report: { summary: 'ok' },
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
      ]),
    };
    conversationRepository.dataSource.getRepository.mockReturnValue({
      createQueryBuilder: vi.fn().mockReturnValue(qb),
    });

    const request: any = { params: { conversationId: 'c1' }, query: { limit: '1', offset: '0' } };
    await controller.getConversationQualityReports(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.reports.length).toBe(1);
  });

  it('should list latest quality reports', async () => {
    const controller = makeController();
    const reply = createReply();
    const qb = {
      take: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          id: 'qr-2',
          conversationId: 'c2',
          problemId: null,
          qualityScore: 66,
          report: { summary: 'ok' },
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
      ]),
    };
    conversationRepository.dataSource.getRepository.mockReturnValue({
      createQueryBuilder: vi.fn().mockReturnValue(qb),
    });

    const request: any = { query: { limit: '1', offset: '0' } };
    await controller.listQualityReports(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.reports[0].id).toBe('qr-2');
  });

  it('should stream review requests and cleanup on close', async () => {
    const controller = makeController();
    const write = vi.fn();
    const end = vi.fn();
    const setHeader = vi.fn();
    const flushHeaders = vi.fn();
    const closeHandlers: Array<() => void> = [];
    const request: any = {
      raw: {
        on: (event: string, handler: () => void) => {
          if (event === 'close') {
            closeHandlers.push(handler);
          }
        },
      },
    };
    const reply: any = {
      raw: { setHeader, flushHeaders, write, end },
    };

    const engineOn = vi.fn();
    const engineOff = vi.fn();
    vi.spyOn(WorkflowRegistry, 'getWorkflowEngine').mockReturnValue({
      on: engineOn,
      off: engineOff,
    } as any);

    vi.useFakeTimers();
    await controller.streamReviewRequests(request, reply);

    expect(setHeader).toHaveBeenCalled();

    // emit review stream event
    const stream = (await import('@infrastructure/reviews/ReviewRequestStream'))
      .ReviewRequestStream.getInstance();
    stream.emitRequested({
      reviewId: 'r1',
      conversationId: 'c1',
      suggestion: {},
      confidence: 0.6,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    });

    // keep alive tick
    await vi.advanceTimersByTimeAsync(15000);
    expect(write).toHaveBeenCalled();

    // close connection
    closeHandlers.forEach((handler) => handler());
    expect(end).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should fallback to ai analysis when no quality report', async () => {
    const controller = makeController();
    const reply = createReply();

    vi.spyOn(QualityReportRepository.prototype, 'findLatestByConversationId')
      .mockResolvedValueOnce(null as any);

    conversationRepository.findById.mockResolvedValue({
      id: 'c-quality',
      customerId: 'cust-1',
      priority: 'normal',
      status: 'open',
      channel: { value: 'web' },
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      messages: [
        {
          senderType: 'customer',
          content: '需要帮助',
          sentAt: new Date('2024-01-01T00:00:00Z'),
        },
      ],
    });
    customerProfileRepository.findById.mockResolvedValue({
      name: '客户A',
      metrics: { satisfactionScore: 4 },
      isVIP: false,
      slaInfo: { serviceLevel: '普通' },
    });
    aiService.analyzeConversation.mockResolvedValue({
      score: 0.9,
      summary: 'ok',
      issues: [],
      improvementSuggestions: ['提示1'],
      keyPhrases: [{ phrase: '帮助' }],
      overallSentiment: 'neutral',
      result: { score: 0.9 },
    });

    const request: any = { params: { conversationId: 'c-quality' } };
    await controller.getConversationQuality(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.score).toBeGreaterThan(0);
  });

  it('handles incoming message when history/knowledge/task lookups fail', async () => {
    const controller = makeController();
    const reply = createReply();

    coordinator.processCustomerMessage.mockResolvedValue({
      conversationId: 'conv-err',
      agentSuggestion: null,
      status: 'ok',
    });
    conversationRepository.findById.mockRejectedValue(new Error('db down'));
    aiService.analyzeSentiment.mockResolvedValue({ overallSentiment: 'neutral', score: 0.5, confidence: 0.5 });
    aiService.llmClient.isEnabled.mockReturnValue(false);
    searchKnowledgeUseCase.execute.mockRejectedValue(new Error('search failed'));
    taskRepository.findByFilters.mockRejectedValue(new Error('tasks failed'));

    const request: any = {
      body: { customerId: 'c1', content: 'hi', channel: 'web', senderId: 's1' },
    };

    await controller.handleIncomingMessage(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.analysis.knowledgeRecommendations).toEqual([]);
    expect(reply.payload.data.analysis.relatedTasks).toEqual([]);
  });

  it('returns empty conversations when total is 0', async () => {
    const controller = makeController();
    const reply = createReply();

    conversationRepository.findByFilters.mockResolvedValue([]);
    conversationRepository.countByFilters.mockResolvedValue(0);

    await controller.getConversations({ query: { status: 'active' } } as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.total).toBe(0);
  });

  it('returns stats with zero when no conversations', async () => {
    const controller = makeController();
    const reply = createReply();

    conversationRepository.countByFilters.mockResolvedValue(0);

    await controller.getConversationStats({ query: {} } as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.statusCounts.all).toBe(0);
  });

  it('returns null problem stats when LLM disabled', async () => {
    const controller = makeController();
    const reply = createReply();

    aiService.llmClient.isEnabled.mockReturnValue(false);
    const conversations = [
      {
        id: 'c1',
        customerId: 'cust-1',
        channel: { value: 'web' },
        status: 'open',
        priority: 'normal',
        messages: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
    ];
    conversationRepository.countByFilters.mockResolvedValue(1);
    conversationRepository.findByFilters.mockResolvedValue(conversations as any);
    customerProfileRepository.findById.mockResolvedValue({ name: '客户A', isVIP: false });

    await controller.getConversationStats({ query: { channel: 'web' } } as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.statusCounts.pending).toBeNull();
  });

  it('returns problem=false when no customer content', async () => {
    const controller = makeController();
    const reply = createReply();
    const conversationList = [
      {
        id: 'c1',
        customerId: 'cust-1',
        channel: { value: 'wecom' },
        status: 'open',
        mode: 'auto',
        priority: 'normal',
        agentId: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        metadata: {},
        messages: [{ senderType: 'customer', content: '' }],
      },
    ];
    conversationRepository.findByFilters.mockResolvedValue(conversationList as any);
    conversationRepository.countByFilters.mockResolvedValue(1);
    customerProfileRepository.findById.mockResolvedValue({ name: '客户A', isVIP: false });
    aiService.llmClient.extractIntent.mockResolvedValue({ intent: 'inquiry', isQuestion: false, confidence: 0.2 });

    await controller.getConversations({ query: { channel: 'wecom', includeProblem: 'true' } } as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.conversations[0].isProblem).toBe(false);
  });

  it('returns 500 when sendMessage fails', async () => {
    const controller = makeController();
    const reply = createReply();
    conversationRepository.findById.mockResolvedValue({ id: 'c1', customerId: 'cust-1', agentId: 'a1' });
    sendMessageUseCase.execute.mockRejectedValue(new Error('fail'));

    await controller.sendMessage({ params: { id: 'c1' }, body: { content: 'hi' } } as any, reply);

    expect(reply.statusCode).toBe(500);
  });

  it('submits review without task creation when disabled', async () => {
    const controller = makeController();
    const reply = createReply();
    reviewRequestRepository.findById.mockResolvedValue({
      id: 'review-1',
      conversationId: 'conv-1',
      suggestion: { executionId: 'exec-1', stepName: 'step-1' },
    });
    completeReviewRequestUseCase.execute.mockResolvedValue({});
    const submitSpy = vi.spyOn(WorkflowRegistry, 'submitHumanResponse');

    await controller.submitAgentReview(
      { body: { reviewId: 'review-1', status: 'rejected', createTasks: false }, user: { sub: 'u1' } } as any,
      reply,
    );

    expect(reply.statusCode).toBe(200);
    expect(submitSpy).toHaveBeenCalled();
    expect(createTaskUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns 400/404 on updateConversationStatus failures', async () => {
    const controller = makeController();
    const replyMissing = createReply();
    const replyNotFound = createReply();

    await controller.updateConversationStatus({ params: { id: 'c1' }, body: {} } as any, replyMissing);
    expect(replyMissing.statusCode).toBe(400);

    conversationRepository.findById.mockResolvedValue(null);
    await controller.updateConversationStatus({ params: { id: 'c1' }, body: { status: 'open' } } as any, replyNotFound);
    expect(replyNotFound.statusCode).toBe(404);
  });

  it('rejects invalid conversation mode', async () => {
    const controller = makeController();
    const reply = createReply();

    await controller.setConversationMode({ params: { id: 'c1' }, body: { mode: 'invalid' } } as any, reply);

    expect(reply.statusCode).toBe(400);
  });

  it('returns 400 when conversation id missing for sentiment', async () => {
    const controller = makeController();
    const reply = createReply();

    await controller.getConversationSentiment({ params: {} } as any, reply);

    expect(reply.statusCode).toBe(400);
  });

  it('returns neutral sentiment when no customer messages', async () => {
    const controller = makeController();
    const reply = createReply();

    conversationRepository.findById.mockResolvedValue({
      id: 'c1',
      messages: [{ senderType: 'agent', content: 'ok' }],
    });

    await controller.getConversationSentiment({ params: { id: 'c1' } } as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.sentiment.type).toBe('neutral');
  });

  it('returns 404 when conversation missing for quality fallback', async () => {
    const controller = makeController();
    const reply = createReply();

    vi.spyOn(QualityReportRepository.prototype, 'findLatestByConversationId')
      .mockRejectedValueOnce(new Error('repo down'));
    conversationRepository.findById.mockResolvedValue(null);

    await controller.getConversationQuality({ params: { conversationId: 'missing' } } as any, reply);

    expect(reply.statusCode).toBe(404);
  });

  it('returns null replySuggestion when no customer message', async () => {
    const controller = makeController();
    const reply = createReply();

    conversationRepository.findById.mockResolvedValue({
      id: 'c1',
      customerId: 'cust',
      priority: 'normal',
      channel: { value: 'web' },
      messages: [{ senderType: 'agent', content: 'hi', sentAt: new Date('2024-01-01T00:00:00Z') }],
      metadata: {},
    });
    searchKnowledgeUseCase.execute.mockResolvedValue([]);
    taskRepository.findByFilters.mockResolvedValue([]);
    aiService.analyzeSentiment.mockResolvedValue({ overallSentiment: 'neutral', score: 0.5, confidence: 0.5 });
    aiService.analyzeConversation.mockResolvedValue({ issues: [], improvementSuggestions: [] });
    aiService.llmClient.isEnabled.mockReturnValue(false);

    await controller.getConversationAiAnalysis({ params: { id: 'c1' } } as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.replySuggestion).toBeNull();
  });

  it('falls back to default reply when LLM fails', async () => {
    const controller = makeController();
    const reply = createReply();

    conversationRepository.findById.mockResolvedValue({
      id: 'c2',
      customerId: 'cust',
      priority: 'normal',
      channel: { value: 'web' },
      messages: [{ senderType: 'customer', content: 'help', sentAt: new Date('2024-01-01T00:00:00Z') }],
      metadata: {},
    });
    searchKnowledgeUseCase.execute.mockResolvedValue([]);
    taskRepository.findByFilters.mockResolvedValue([]);
    aiService.analyzeSentiment.mockResolvedValue({ overallSentiment: 'neutral', score: 0.5, confidence: 0.5 });
    aiService.analyzeConversation.mockResolvedValue({ issues: [], improvementSuggestions: [] });
    aiService.llmClient.isEnabled.mockReturnValue(true);
    aiService.llmClient.generateReply.mockRejectedValue(new Error('fail'));

    await controller.getConversationAiAnalysis({ params: { id: 'c2' } } as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.replySuggestion.reason).toBe('assistant_unavailable');
  });

  it('syncs wecom mock group chats with reset and mixed messages', async () => {
    const controller = makeController();
    const reply = createReply();
    const assignAgent = vi.fn();

    coordinator.processCustomerMessage.mockResolvedValue({
      conversationId: 'conv-1',
    });
    conversationRepository.findById.mockResolvedValue({
      id: 'conv-1',
      agentId: null,
      assignAgent,
      messages: [],
    });
    customerProfileRepository.findById.mockResolvedValue(null);

    vi.spyOn(controller as any, 'loadWecomMockData').mockResolvedValue({
      groupChatList: {
        group_chat_list: [{ chat_id: 'chat1', status: 1 }],
      },
      groupChatDetails: {
        group_chat_details: {
          chat1: {
            group_chat: {
              name: '群1',
              member_list: [
                { userid: 'u1', name: '张三', type: 1 },
                { userid: 'u2', name: '李四', type: 2 },
              ],
            },
          },
        },
      },
      groupChatMessages: {
        group_chat_messages: {
          chat1: [
            {
              sender_id: 'u2',
              sender_type: 'customer',
              content: '无法登录',
              sent_at: 2,
              issue_product: 'login',
              fault_level: 'high',
            },
            {
              sender_id: 'u1',
              sender_type: 'agent',
              content: '好的',
              sent_at: 3,
            },
            {
              sender_id: 'u2',
              sender_type: 'customer',
              content: '',
              sent_at: 4,
            },
          ],
        },
      },
    });

    await controller.syncWecomMockGroupChats(
      { body: { limit: 1, reset: true } } as any,
      reply,
    );

    expect(conversationRepository.deleteByChannel).toHaveBeenCalledWith('wecom');
    expect(conversationRepository.deleteByCustomerId).toHaveBeenCalledWith('wecom-chat1');
    expect(customerProfileRepository.save).toHaveBeenCalled();
    expect(assignAgent).toHaveBeenCalled();
    expect(sendMessageUseCase.execute).toHaveBeenCalled();
    expect(reply.payload.data.customersCreated).toBe(1);
    expect(reply.payload.data.messagesImported).toBe(2);
  });

  it('syncs wecom mock group chats and skips missing details', async () => {
    const controller = makeController();
    const reply = createReply();

    vi.spyOn(controller as any, 'loadWecomMockData').mockResolvedValue({
      groupChatList: {
        group_chat_list: [{ chat_id: 'chat-missing', status: 1 }],
      },
      groupChatDetails: { group_chat_details: {} },
      groupChatMessages: { group_chat_messages: {} },
    });

    await controller.syncWecomMockGroupChats(
      { body: { limit: 1 } } as any,
      reply,
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.groupChats).toBe(1);
    expect(reply.payload.data.customersCreated).toBe(0);
    expect(reply.payload.data.messagesImported).toBe(0);
  });

  it('returns 404 when customer profile is missing', async () => {
    const controller = makeController();
    const reply = createReply();
    customerProfileRepository.findById.mockResolvedValue(null);

    await controller.getCustomerProfile({ params: { customerId: 'missing' } } as any, reply);

    expect(reply.statusCode).toBe(404);
  });

  it('maps sentiment labels from analysis result', async () => {
    const controller = makeController();
    const reply = createReply();

    conversationRepository.findById.mockResolvedValue({
      id: 'conv-1',
      messages: [
        { senderType: 'external', content: '着急', sentAt: new Date('2024-01-01T00:00:00Z') },
      ],
    });
    aiService.analyzeSentiment.mockResolvedValue({
      overallSentiment: 'Urgent',
      score: 0.4,
      confidence: 0.6,
    });

    await controller.getConversationSentiment({ params: { id: 'conv-1' } } as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.sentiment.label).toBe('紧急');
  });

  it('returns "未知" label for unmapped sentiment', async () => {
    const controller = makeController();
    const reply = createReply();

    conversationRepository.findById.mockResolvedValue({
      id: 'conv-2',
      messages: [
        { senderType: 'external', content: 'unknown', sentAt: new Date('2024-01-01T00:00:00Z') },
      ],
    });
    aiService.analyzeSentiment.mockResolvedValue({
      overallSentiment: 'mystery',
      score: 0.4,
      confidence: 0.6,
    });

    await controller.getConversationSentiment({ params: { id: 'conv-2' } } as any, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.data.sentiment.label).toBe('未知');
  });

  it('throws when wecom mock json missing in all paths', async () => {
    const controller = makeController();
    const readSpy = vi
      .spyOn(fs, 'readFile')
      .mockRejectedValue(new Error('missing'));

    await expect((controller as any).readWecomMockJson('missing.json')).rejects.toThrow(
      'WeCom mock data file not found: missing.json',
    );
    expect(readSpy).toHaveBeenCalledTimes(2);
    readSpy.mockRestore();
  });
});
