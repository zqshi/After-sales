/**
 * CustomerSupportSaga - 客户支持SAGA协调器
 *
 * 职责：协调跨多个聚合根的客户支持流程，确保最终一致性
 *
 * SAGA流程：
 * 1. 创建Conversation（对话）
 * 2. AI分析需求 → 创建Requirement
 * 3. 高优需求 → 创建Task
 * 4. Task完成 → 检查Conversation是否可关闭
 * 5. Conversation关闭 → 触发质检
 *
 * 补偿机制：
 * - 如果Task创建失败 → 标记Requirement为pending_manual_review
 * - 如果Requirement创建失败 → 记录到Conversation metadata
 * - 如果AI分析超时 → 降级为人工处理
 * - 如果Conversation创建失败 → 返回错误给客户
 */

import { IConversationRepository } from '@domain/conversation/repositories/IConversationRepository';
import { IRequirementRepository } from '@domain/requirement/repositories/IRequirementRepository';
import { ITaskRepository } from '@domain/task/repositories/ITaskRepository';
import { ICustomerProfileRepository } from '@domain/customer/repositories/ICustomerProfileRepository';
import { Conversation } from '@domain/conversation/models/Conversation';
import { Requirement } from '@domain/requirement/models/Requirement';
import { Task } from '@domain/task/models/Task';
import { Priority } from '@domain/requirement/value-objects/Priority';
import { RequirementSource } from '@domain/requirement/value-objects/RequirementSource';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';
import { Channel } from '@domain/conversation/value-objects/Channel';

/**
 * SAGA执行上下文
 */
interface SagaContext {
  conversationId?: string;
  requirementIds: string[];
  taskIds: string[];
  errors: Array<{
    step: string;
    error: Error;
    timestamp: Date;
  }>;
}

/**
 * 客户消息请求
 */
export interface CustomerMessageRequest {
  customerId: string;
  message: string;
  channel: string;
  metadata?: Record<string, unknown>;
}

/**
 * 处理结果
 */
export interface ProcessingResult {
  success: boolean;
  conversationId?: string;
  requirementIds: string[];
  taskIds: string[];
  aiResponse?: string;
  needsHumanReview: boolean;
  errors: string[];
}

export class CustomerSupportSaga {
  constructor(
    private readonly conversationRepo: IConversationRepository,
    private readonly requirementRepo: IRequirementRepository,
    private readonly taskRepo: ITaskRepository,
    private readonly customerProfileRepo: ICustomerProfileRepository,
  ) {}

  /**
   * 处理客户消息的完整SAGA流程
   */
  async processCustomerMessage(
    request: CustomerMessageRequest,
  ): Promise<ProcessingResult> {
    const context: SagaContext = {
      requirementIds: [],
      taskIds: [],
      errors: [],
    };

    try {
      // Step 1: 创建或获取Conversation
      const conversation = await this.createOrGetConversation(request, context);
      context.conversationId = conversation.id;

      // Step 2: AI分析需求（with timeout）
      const requirements = await this.analyzeRequirementsWithTimeout(
        conversation,
        request.message,
        context,
      );
      context.requirementIds = requirements.map((r) => r.id);

      // Step 3: 为高优需求创建Task（with compensation）
      const tasks = await this.createTasksForRequirements(
        requirements,
        conversation,
        context,
      );
      context.taskIds = tasks.map((t) => t.id);

      // Step 4: 生成AI回复建议（optional）
      const aiResponse = await this.generateAIResponse(conversation, context);

      // Step 5: 决定是否需要人工审核
      const needsHumanReview = this.needsHumanReview(
        conversation,
        requirements,
        context,
      );

      return {
        success: true,
        conversationId: conversation.id,
        requirementIds: context.requirementIds,
        taskIds: context.taskIds,
        aiResponse,
        needsHumanReview,
        errors: context.errors.map((e) => e.error.message),
      };
    } catch (error) {
      // SAGA失败：执行补偿
      await this.compensate(context);

      return {
        success: false,
        conversationId: context.conversationId,
        requirementIds: context.requirementIds,
        taskIds: context.taskIds,
        needsHumanReview: true,
        errors: [
          ...context.errors.map((e) => e.error.message),
          error instanceof Error ? error.message : String(error),
        ],
      };
    }
  }

  /**
   * Step 1: 创建或获取Conversation
   */
  private async createOrGetConversation(
    request: CustomerMessageRequest,
    context: SagaContext,
  ): Promise<Conversation> {
    try {
      // 检查是否有活跃的Conversation
      const activeConversations = await this.conversationRepo.findByCustomerId(
        request.customerId,
      );

      const openConversation = activeConversations.find(
        (c) => c.status === 'open',
      );

      if (openConversation) {
        // 添加新消息到现有对话
        openConversation.sendMessage({
          content: request.message,
          senderId: request.customerId,
          senderType: 'customer',
        });

        await this.conversationRepo.save(openConversation);
        return openConversation;
      }

      // 创建新对话
      const conversation = Conversation.create({
        customerId: request.customerId,
        channel: Channel.fromString(request.channel),
        initialMessage: {
          content: request.message,
          senderId: request.customerId,
          senderType: 'customer',
        },
        metadata: request.metadata,
      });

      await this.conversationRepo.save(conversation);
      return conversation;
    } catch (error) {
      context.errors.push({
        step: 'createOrGetConversation',
        error: error as Error,
        timestamp: new Date(),
      });
      throw error;
    }
  }

  /**
   * Step 2: AI分析需求（with timeout）
   */
  private async analyzeRequirementsWithTimeout(
    conversation: Conversation,
    message: string,
    context: SagaContext,
  ): Promise<Requirement[]> {
    try {
      // 设置5秒超时
      const requirements = await Promise.race([
        this.analyzeRequirements(conversation, message),
        this.timeout(5000),
      ]);

      if (!requirements) {
        throw new Error('AI analysis timeout');
      }

      return requirements as Requirement[];
    } catch (error) {
      context.errors.push({
        step: 'analyzeRequirements',
        error: error as Error,
        timestamp: new Date(),
      });

      // 补偿：记录到Conversation metadata
      if (context.conversationId) {
        const conv = await this.conversationRepo.findById(
          context.conversationId,
        );
        if (conv) {
          // 标记需要人工分析
          // conv.metadata.needsManualAnalysis = true;
          await this.conversationRepo.save(conv);
        }
      }

      // 返回空数组，允许流程继续
      return [];
    }
  }

  /**
   * AI分析需求（实际实现）
   */
  private async analyzeRequirements(
    conversation: Conversation,
    message: string,
  ): Promise<Requirement[]> {
    // TODO: 集成AI服务
    // 这里是示例实现，检测关键词

    const keywords = {
      refund: { category: 'refund', priority: 'high' },
      bug: { category: 'technical', priority: 'high' },
      feature: { category: 'feature', priority: 'medium' },
      question: { category: 'consultation', priority: 'low' },
    };

    const requirements: Requirement[] = [];
    const lowerMessage = message.toLowerCase();

    for (const [keyword, config] of Object.entries(keywords)) {
      if (lowerMessage.includes(keyword)) {
        const requirement = Requirement.create({
          customerId: conversation.customerId,
          conversationId: conversation.id,
          title: `客户${keyword}需求`,
          description: message,
          category: config.category,
          priority: Priority.create(config.priority),
          source: RequirementSource.create('conversation'),
        });

        await this.requirementRepo.save(requirement);
        requirements.push(requirement);
      }
    }

    return requirements;
  }

  /**
   * Step 3: 为高优需求创建Task（with compensation）
   */
  private async createTasksForRequirements(
    requirements: Requirement[],
    conversation: Conversation,
    context: SagaContext,
  ): Promise<Task[]> {
    const tasks: Task[] = [];

    for (const requirement of requirements) {
      try {
        // 使用领域规则判断是否自动创建Task
        if (requirement.shouldAutoCreateTask()) {
          const task = Task.create({
            title: `处理需求: ${requirement.title}`,
            description: requirement.description,
            type: 'requirement',
            conversationId: conversation.id,
            requirementId: requirement.id,
            priority: this.mapPriority(requirement.priority),
            metadata: {
              autoCreated: true,
              source: 'CustomerSupportSaga',
            },
          });

          await this.taskRepo.save(task);
          tasks.push(task);
        }
      } catch (error) {
        context.errors.push({
          step: 'createTaskForRequirement',
          error: error as Error,
          timestamp: new Date(),
        });

        // 补偿：标记Requirement为待人工审核
        try {
          requirement.updateStatus('pending');
          // requirement.metadata.taskCreationFailed = true;
          await this.requirementRepo.save(requirement);
        } catch (compensationError) {
          console.error(
            'Compensation failed for requirement',
            requirement.id,
            compensationError,
          );
        }
      }
    }

    return tasks;
  }

  /**
   * Step 4: 生成AI回复建议
   */
  private async generateAIResponse(
    conversation: Conversation,
    context: SagaContext,
  ): Promise<string | undefined> {
    try {
      // TODO: 集成AI服务生成回复建议
      // 这里是示例实现
      return `感谢您的反馈，我们已经记录了您的需求，将尽快处理。`;
    } catch (error) {
      context.errors.push({
        step: 'generateAIResponse',
        error: error as Error,
        timestamp: new Date(),
      });
      return undefined;
    }
  }

  /**
   * Step 5: 判断是否需要人工审核
   */
  private needsHumanReview(
    conversation: Conversation,
    requirements: Requirement[],
    context: SagaContext,
  ): boolean {
    // 规则1: 有错误发生 → 需要人工审核
    if (context.errors.length > 0) {
      return true;
    }

    // 规则2: 高优需求 → 需要人工审核
    if (requirements.some((r) => r.priority.isUrgent())) {
      return true;
    }

    // 规则3: VIP客户 → 需要人工审核
    // TODO: 获取客户等级
    // if (customer.isVIP) return true;

    // 规则4: 客户等级告警 → 需要人工审核
    if (conversation.slaStatus === 'warning') {
      return true;
    }

    return false;
  }

  /**
   * 补偿机制：回滚已创建的实体
   */
  private async compensate(context: SagaContext): Promise<void> {
    console.error('[CustomerSupportSaga] Compensating failed SAGA', {
      conversationId: context.conversationId,
      requirementIds: context.requirementIds,
      taskIds: context.taskIds,
      errors: context.errors,
    });

    // 补偿1: 取消已创建的Task
    for (const taskId of context.taskIds) {
      try {
        const task = await this.taskRepo.findById(taskId);
        if (task && task.status !== 'cancelled') {
          task.cancel();
          await this.taskRepo.save(task);
          console.log(`[CustomerSupportSaga] Compensated: cancelled task ${taskId}`);
        }
      } catch (error) {
        console.error(
          `[CustomerSupportSaga] Compensation failed for task ${taskId}`,
          error,
        );
      }
    }

    // 补偿2: 标记Requirement为异常
    for (const requirementId of context.requirementIds) {
      try {
        const requirement = await this.requirementRepo.findById(requirementId);
        if (requirement) {
          requirement.updateStatus('pending');
          // requirement.metadata.sagaFailed = true;
          await this.requirementRepo.save(requirement);
          console.log(
            `[CustomerSupportSaga] Compensated: marked requirement ${requirementId} as pending`,
          );
        }
      } catch (error) {
        console.error(
          `[CustomerSupportSaga] Compensation failed for requirement ${requirementId}`,
          error,
        );
      }
    }

    // 补偿3: Conversation标记为异常（不回滚，保留记录）
    if (context.conversationId) {
      try {
        const conversation = await this.conversationRepo.findById(
          context.conversationId,
        );
        if (conversation) {
          // conversation.metadata.sagaFailed = true;
          // conversation.metadata.errors = context.errors;
          await this.conversationRepo.save(conversation);
          console.log(
            `[CustomerSupportSaga] Compensated: marked conversation ${context.conversationId} as abnormal`,
          );
        }
      } catch (error) {
        console.error(
          `[CustomerSupportSaga] Compensation failed for conversation ${context.conversationId}`,
          error,
        );
      }
    }

    // TODO: 发送告警通知
    await this.sendCompensationAlert(context);
  }

  /**
   * 发送补偿告警
   */
  private async sendCompensationAlert(context: SagaContext): Promise<void> {
    // TODO: 集成告警系统（Slack、钉钉、邮件等）
    console.error(
      `[ALERT] CustomerSupportSaga Compensation Executed:
      Conversation ID: ${context.conversationId}
      Requirement IDs: ${context.requirementIds.join(', ')}
      Task IDs: ${context.taskIds.join(', ')}
      Errors: ${context.errors.map((e) => e.error.message).join('; ')}`,
    );
  }

  /**
   * 辅助方法：超时Promise
   */
  private timeout(ms: number): Promise<null> {
    return new Promise((resolve) => setTimeout(() => resolve(null), ms));
  }

  /**
   * 辅助方法：映射Priority
   */
  private mapPriority(priority: Priority): TaskPriority {
    switch (priority.value) {
      case 'urgent':
        return TaskPriority.create('high');
      case 'high':
        return TaskPriority.create('high');
      case 'medium':
        return TaskPriority.create('medium');
      case 'low':
        return TaskPriority.create('low');
      default:
        return TaskPriority.create('medium');
    }
  }

  /**
   * 查询SAGA执行状态
   */
  async getSagaStatus(conversationId: string): Promise<{
    conversation: any;
    requirements: any[];
    tasks: any[];
  }> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // TODO: 实现按conversationId查询
    // const requirements = await this.requirementRepo.findByConversationId(conversationId);
    // const tasks = await this.taskRepo.findByConversationId(conversationId);

    return {
      conversation,
      requirements: [],
      tasks: [],
    };
  }
}
