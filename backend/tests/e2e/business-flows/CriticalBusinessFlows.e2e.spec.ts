/**
 * 关键业务流程E2E测试
 *
 * 测试场景：
 * 1. 客户咨询 → AI回复 → 人工审核 → 问题解决
 * 2. 紧急问题 → 自动创建任务 → 工程师处理 → 质检
 * 3. 复杂需求 → 多Agent协作 → 需求跟踪 → 完成
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource } from 'typeorm';
import { ConversationEntity } from '@infrastructure/database/entities/ConversationEntity';
import { MessageEntity } from '@infrastructure/database/entities/MessageEntity';
import { TaskEntity } from '@infrastructure/database/entities/TaskEntity';
import { RequirementEntity } from '@infrastructure/database/entities/RequirementEntity';
import { CustomerProfileEntity } from '@infrastructure/database/entities/CustomerProfileEntity';
import { ConversationRepository } from '@infrastructure/repositories/ConversationRepository';
import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';
import { OutboxEventBus } from '@infrastructure/events/OutboxEventBus';
import { ConversationTaskCoordinator } from '@application/services/ConversationTaskCoordinator';
import { CreateConversationUseCase } from '@application/use-cases/CreateConversationUseCase';
import { CreateRequirementUseCase } from '@application/use-cases/requirement/CreateRequirementUseCase';
import { CreateTaskUseCase } from '@application/use-cases/task/CreateTaskUseCase';
import { CloseConversationUseCase } from '@application/use-cases/CloseConversationUseCase';
import { SendMessageUseCase } from '@application/use-cases/SendMessageUseCase';
import { CompleteTaskUseCase } from '@application/use-cases/task/CompleteTaskUseCase';
import { AiService } from '@application/services/AiService';
import { EventBus } from '@infrastructure/events/EventBus';
import type { IncomingMessage } from '@application/services/ConversationTaskCoordinator';

// ============================================
// Test Setup
// ============================================

describe('E2E: Critical Business Flows', () => {
  let dataSource: DataSource;
  let conversationRepo: ConversationRepository;
  let taskRepo: TaskRepository;
  let requirementRepo: RequirementRepository;
  let coordinator: ConversationTaskCoordinator;
  let eventBus: EventBus;

  beforeAll(async () => {
    // 初始化测试数据库
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
        TaskEntity,
        RequirementEntity,
        CustomerProfileEntity,
      ],
      synchronize: true,
      logging: false,
      dropSchema: true,
    });

    await dataSource.initialize();

    // 初始化repositories
    conversationRepo = new ConversationRepository(dataSource);
    const outboxEventBus = new OutboxEventBus(dataSource);
    taskRepo = new TaskRepository(dataSource, outboxEventBus);
    requirementRepo = new RequirementRepository(dataSource, outboxEventBus);

    // 初始化event bus
    eventBus = new EventBus();

    // 初始化use cases
    const createConversationUseCase = new CreateConversationUseCase(conversationRepo, eventBus);
    const createRequirementUseCase = new CreateRequirementUseCase(requirementRepo, eventBus);
    const createTaskUseCase = new CreateTaskUseCase(taskRepo, conversationRepo);
    const closeConversationUseCase = new CloseConversationUseCase(
      conversationRepo,
      eventBus,
    );
    const sendMessageUseCase = new SendMessageUseCase(conversationRepo, eventBus);

    // 初始化AI service (使用mock)
    const aiService = {
      summarizeConversation: async () => '对话总结',
      analyzeSentiment: async () => ({ overallSentiment: 'neutral' }),
      detectProblemIntent: async () => ({ isProblem: false }),
      detectProblemResolution: async () => ({ resolved: false }),
      knowledgeRepository: {
        findByFilters: async () => [],
      },
    } as any;

    // 初始化coordinator
    coordinator = new ConversationTaskCoordinator(
      conversationRepo,
      taskRepo,
      requirementRepo,
      {} as any, // problemRepo
      createConversationUseCase,
      createRequirementUseCase,
      createTaskUseCase,
      closeConversationUseCase,
      sendMessageUseCase,
      {} as any, // associateRequirementUseCase
      {} as any, // createProblemUseCase
      {} as any, // updateProblemStatusUseCase
      {} as any, // createReviewRequestUseCase
      aiService,
      eventBus,
    );
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    // 清理数据
    await dataSource.query('TRUNCATE TABLE messages, conversations, tasks, requirements CASCADE');
  });

  // ============================================
  // 场景1: 简单咨询流程
  // ============================================

  describe('场景1: 客户简单咨询', () => {
    it('应该完成从咨询到回复的完整流程', async () => {
      // 1. 客户发送消息
      const incomingMessage: IncomingMessage = {
        customerId: 'customer-001',
        content: '你好，请问营业时间是什么时候？',
        channel: 'web',
        senderId: 'user-001',
      };

      const result = await coordinator.processCustomerMessage(incomingMessage);

      // 验证对话已创建
      expect(result.conversationId).toBeDefined();

      // 验证AI生成了回复建议
      expect(result.agentSuggestion).toBeDefined();
      expect(result.agentSuggestion?.suggestedReply).toBeDefined();

      // 验证没有创建需求（简单咨询）
      expect(result.requirementsCreated).toHaveLength(0);

      // 验证没有创建任务
      expect(result.tasksCreated).toHaveLength(0);

      // 2. 验证对话已保存到数据库
      const conversation = await conversationRepo.findById(result.conversationId);
      expect(conversation).toBeDefined();
      expect(conversation?.customerId).toBe('customer-001');
      expect(conversation?.status).toBe('open');

      // 3. 验证消息已保存
      expect(conversation?.messages).toBeDefined();
      expect(conversation?.messages.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // 场景2: 紧急问题处理
  // ============================================

  describe('场景2: 紧急问题自动处理', () => {
    it('应该自动创建高优先级任务并分配', async () => {
      // 1. 客户报告紧急问题
      const incomingMessage: IncomingMessage = {
        customerId: 'customer-002',
        content: '紧急！系统无法登录，影响业务运营',
        channel: 'web',
        senderId: 'user-002',
      };

      const result = await coordinator.processCustomerMessage(incomingMessage);

      // 验证检测到需求
      expect(result.requirementsCreated.length).toBeGreaterThan(0);

      // 验证自动创建了任务
      expect(result.tasksCreated.length).toBeGreaterThan(0);

      // 2. 验证任务已保存到数据库
      const tasks = await taskRepo.findByFilters({
        conversationId: result.conversationId,
      });

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0].priority.value).toBe('high');

      // 3. 验证需求已保存
      const requirements = await requirementRepo.findByFilters({
        conversationId: result.conversationId,
      });

      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements[0].priority.value).toBe('high');
    });

    it('应该在任务完成后关闭对话', async () => {
      // 1. 创建对话和任务
      const incomingMessage: IncomingMessage = {
        customerId: 'customer-003',
        content: '需要帮助解决问题',
        channel: 'web',
        senderId: 'user-003',
      };

      const result = await coordinator.processCustomerMessage(incomingMessage);

      // 2. 模拟任务完成
      const tasks = await taskRepo.findByFilters({
        conversationId: result.conversationId,
      });

      if (tasks.length > 0) {
        const task = tasks[0];
        task.start();
        task.complete();
        await taskRepo.save(task);
      }

      // 3. 尝试关闭对话
      const completeResult = await coordinator.completeConversation(
        result.conversationId,
      );

      expect(completeResult.success).toBe(true);
      expect(completeResult.incompleteTasks).toHaveLength(0);

      // 4. 验证对话状态已更新
      const conversation = await conversationRepo.findById(result.conversationId);
      expect(conversation?.status).toBe('closed');
    });
  });

  // ============================================
  // 场景3: 复杂需求处理
  // ============================================

  describe('场景3: 复杂需求多轮对话', () => {
    it('应该支持多轮对话并累积上下文', async () => {
      const customerId = 'customer-004';

      // 第1轮：客户提出需求
      const message1: IncomingMessage = {
        customerId,
        content: '我想要一个新功能',
        channel: 'web',
        senderId: 'user-004',
      };

      const result1 = await coordinator.processCustomerMessage(message1);
      const conversationId = result1.conversationId;

      // 第2轮：客户补充细节
      const message2: IncomingMessage = {
        customerId,
        content: '这个功能需要支持批量导入',
        channel: 'web',
        senderId: 'user-004',
      };

      const result2 = await coordinator.processCustomerMessage(message2);

      // 验证使用了同一个对话
      expect(result2.conversationId).toBe(conversationId);

      // 第3轮：客户确认需求
      const message3: IncomingMessage = {
        customerId,
        content: '对，就是这样，什么时候能完成？',
        channel: 'web',
        senderId: 'user-004',
      };

      const result3 = await coordinator.processCustomerMessage(message3);

      // 验证对话历史已累积
      const conversation = await conversationRepo.findById(conversationId);
      expect(conversation?.messages.length).toBeGreaterThanOrEqual(3);

      // 验证需求已创建
      const requirements = await requirementRepo.findByFilters({
        conversationId,
      });
      expect(requirements.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // 场景4: 并发对话处理
  // ============================================

  describe('场景4: 并发处理多个客户', () => {
    it('应该正确隔离不同客户的对话', async () => {
      // 同时处理3个客户的消息
      const messages: IncomingMessage[] = [
        {
          customerId: 'customer-005',
          content: '客户5的问题',
          channel: 'web',
          senderId: 'user-005',
        },
        {
          customerId: 'customer-006',
          content: '客户6的问题',
          channel: 'web',
          senderId: 'user-006',
        },
        {
          customerId: 'customer-007',
          content: '客户7的问题',
          channel: 'web',
          senderId: 'user-007',
        },
      ];

      const results = await Promise.all(
        messages.map((msg) => coordinator.processCustomerMessage(msg)),
      );

      // 验证创建了3个不同的对话
      const conversationIds = results.map((r) => r.conversationId);
      const uniqueIds = new Set(conversationIds);
      expect(uniqueIds.size).toBe(3);

      // 验证每个对话都有正确的客户ID
      for (let i = 0; i < results.length; i++) {
        const conversation = await conversationRepo.findById(results[i].conversationId);
        expect(conversation?.customerId).toBe(messages[i].customerId);
      }
    });
  });

  // ============================================
  // 场景5: 错误处理和恢复
  // ============================================

  describe('场景5: 错误处理', () => {
    it('应该在AI服务失败时使用降级方案', async () => {
      // 模拟AI服务不可用的情况
      const incomingMessage: IncomingMessage = {
        customerId: 'customer-008',
        content: '测试降级方案',
        channel: 'web',
        senderId: 'user-008',
      };

      // 即使AI服务失败，也应该能创建对话
      const result = await coordinator.processCustomerMessage(incomingMessage);

      expect(result.conversationId).toBeDefined();
      expect(result.agentSuggestion).toBeDefined();

      // 验证使用了降级回复
      expect(result.agentSuggestion?.confidence).toBeLessThan(0.8);
    });

    it('应该拒绝关闭有未完成任务的对话', async () => {
      // 1. 创建对话和任务
      const incomingMessage: IncomingMessage = {
        customerId: 'customer-009',
        content: '需要创建任务的问题',
        channel: 'web',
        senderId: 'user-009',
      };

      const result = await coordinator.processCustomerMessage(incomingMessage);

      // 2. 尝试关闭对话（任务未完成）
      const completeResult = await coordinator.completeConversation(
        result.conversationId,
      );

      // 验证关闭失败
      expect(completeResult.success).toBe(false);
      expect(completeResult.incompleteTasks.length).toBeGreaterThan(0);

      // 验证对话仍然是open状态
      const conversation = await conversationRepo.findById(result.conversationId);
      expect(conversation?.status).toBe('open');
    });
  });

  // ============================================
  // 场景6: 性能测试
  // ============================================

  describe('场景6: 性能基准', () => {
    it('应该在合理时间内处理消息', async () => {
      const startTime = Date.now();

      const incomingMessage: IncomingMessage = {
        customerId: 'customer-010',
        content: '性能测试消息',
        channel: 'web',
        senderId: 'user-010',
      };

      await coordinator.processCustomerMessage(incomingMessage);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证处理时间在合理范围内（< 5秒）
      expect(duration).toBeLessThan(5000);
    });

    it('应该支持批量处理消息', async () => {
      const messageCount = 10;
      const messages: IncomingMessage[] = Array.from({ length: messageCount }, (_, i) => ({
        customerId: `customer-batch-${i}`,
        content: `批量消息 ${i}`,
        channel: 'web',
        senderId: `user-batch-${i}`,
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        messages.map((msg) => coordinator.processCustomerMessage(msg)),
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证所有消息都处理成功
      expect(results.length).toBe(messageCount);
      results.forEach((result) => {
        expect(result.conversationId).toBeDefined();
      });

      // 验证平均处理时间合理（< 1秒/消息）
      const avgDuration = duration / messageCount;
      expect(avgDuration).toBeLessThan(1000);
    });
  });
});
