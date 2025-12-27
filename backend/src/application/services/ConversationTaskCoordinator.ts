/**
 * ConversationTaskCoordinator - 对话任务协调服务
 *
 * Saga协调器，负责跨域事务编排：
 * 1. 从客户消息到Task完成的完整流程
 * 2. 内部需求到Conversation的关联
 * 3. 所有Task完成后自动关闭Conversation
 *
 * 设计模式：Saga Pattern（应用层协调）
 */

import { ConversationRepository } from '@infrastructure/repositories/ConversationRepository';
import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';
import { CreateConversationUseCase } from '../use-cases/CreateConversationUseCase';
import { CreateRequirementUseCase } from '../use-cases/requirement/CreateRequirementUseCase';
import { CreateTaskUseCase } from '../use-cases/task/CreateTaskUseCase';
import { CloseConversationUseCase } from '../use-cases/CloseConversationUseCase';
import { AiService } from './AiService';
import { RequirementDetectorService } from '@domain/requirement/services/RequirementDetectorService';
import { EventBus } from '@infrastructure/events/EventBus';
import { ConversationClosedEvent } from '@domain/conversation/events/ConversationClosedEvent';
import { config } from '@config/app.config';

/**
 * 客户消息输入（模拟IM集成接收的消息）
 */
export interface IncomingMessage {
  customerId: string;
  content: string;
  channel: string; // 'feishu' | 'wecom' | 'web'
  senderId: string;
  metadata?: Record<string, unknown>;
}

/**
 * 需求分析结果
 */
export interface RequirementAnalysis {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  source: string;
}

/**
 * Agent生成的回复建议
 */
export interface AgentSuggestion {
  conversationId: string;
  suggestedReply: string;
  confidence: number;
  detectedRequirements: RequirementAnalysis[];
  recommendedTasks: Array<{
    title: string;
    priority: string;
    requirementId?: string;
  }>;
  needsHumanReview: boolean;
  reason?: string;
}

/**
 * 处理结果
 */
export interface ProcessingResult {
  conversationId: string;
  requirementsCreated: string[];
  tasksCreated: string[];
  agentSuggestion?: AgentSuggestion;
  status: 'auto_handled' | 'needs_review' | 'escalated';
}

export class ConversationTaskCoordinator {
  private requirementDetector: RequirementDetectorService;

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly taskRepository: TaskRepository,
    private readonly requirementRepository: RequirementRepository,
    private readonly createConversationUseCase: CreateConversationUseCase,
    private readonly createRequirementUseCase: CreateRequirementUseCase,
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly closeConversationUseCase: CloseConversationUseCase,
    private readonly aiService: AiService,
    private readonly eventBus: EventBus,
  ) {
    this.requirementDetector = new RequirementDetectorService();

    // Phase 2: 订阅ConversationClosedEvent，触发异步质检
    this.eventBus.subscribe('ConversationClosed', this.handleConversationClosed.bind(this));
  }

  /**
   * 处理客户消息的完整流程
   *
   * 流程：
   * 1. 创建或获取Conversation
   * 2. AI分析需求
   * 3. 创建Requirement和Task（如需要）
   * 4. Agent生成回复建议
   * 5. 推送给人工审核（半自动化）
   */
  async processCustomerMessage(msg: IncomingMessage): Promise<ProcessingResult> {
    // Step 1: 创建或获取Conversation
    let conversation = await this.conversationRepository.findByFilters(
      {
        customerId: msg.customerId,
        status: 'open',
      },
      { limit: 1, offset: 0 },
    );

    let conversationId: string;

    if (conversation.length === 0) {
      // 没有活跃对话，创建新的
      const newConv = await this.createConversationUseCase.execute({
        customerId: msg.customerId,
        channel: msg.channel,
        priority: 'normal',
        initialMessage: {
          senderId: msg.senderId,
          senderType: 'external',
          content: msg.content,
          metadata: msg.metadata,
        },
      });
      conversationId = newConv.id;
    } else {
      // 使用现有对话
      conversationId = conversation[0].id;
      // TODO: 添加新消息到现有对话（需要SendMessageUseCase）
    }

    // Step 2: AI分析需求
    const detectedRequirements = await this.analyzeRequirements(msg.content);

    // Step 3: 根据分析结果创建Requirement和Task
    const requirementsCreated: string[] = [];
    const tasksCreated: string[] = [];
    const recommendedTasks: Array<{
      title: string;
      priority: string;
      requirementId?: string;
    }> = [];

    for (const reqAnalysis of detectedRequirements) {
      // 只创建高置信度的需求
      if (reqAnalysis.confidence > 0.7) {
        const requirement = await this.createRequirementUseCase.execute({
          customerId: msg.customerId,
          conversationId,
          title: reqAnalysis.title,
          description: reqAnalysis.description,
          category: reqAnalysis.category,
          priority: reqAnalysis.priority,
          source: reqAnalysis.source as 'conversation' | 'ticket' | 'manual',
          createdBy: 'system',
        });

        requirementsCreated.push(requirement.id);

        // 高优先级需求立即创建Task
        if (reqAnalysis.priority === 'urgent' || reqAnalysis.priority === 'high') {
          const task = await this.createTaskUseCase.execute({
            title: `处理需求: ${reqAnalysis.title}`,
            type: 'support',
            conversationId,
            requirementId: requirement.id,
            priority: reqAnalysis.priority,
          });

          tasksCreated.push(task.id);
        } else {
          // 中低优先级推荐给人工决定是否创建
          recommendedTasks.push({
            title: `处理需求: ${reqAnalysis.title}`,
            priority: reqAnalysis.priority,
            requirementId: requirement.id,
          });
        }
      }
    }

    // Step 4: Agent生成回复建议
    const suggestedReply = await this.generateAgentReply(
      conversationId,
      msg.content,
      detectedRequirements,
    );

    // Step 5: 决定是否需要人工审核
    const needsHumanReview = this.shouldRequireHumanReview({
      confidence: Math.max(...detectedRequirements.map((r) => r.confidence), 0.5),
      hasRequirements: detectedRequirements.length > 0,
      tasksCreated: tasksCreated.length,
    });

    const agentSuggestion: AgentSuggestion = {
      conversationId,
      suggestedReply,
      confidence: Math.max(...detectedRequirements.map((r) => r.confidence), 0.8),
      detectedRequirements,
      recommendedTasks,
      needsHumanReview,
      reason: needsHumanReview
        ? '检测到复杂需求，建议人工审核'
        : undefined,
    };

    // Step 6: 推送给前端（WebSocket或HTTP轮询）
    if (needsHumanReview) {
      await this.notifyHumanReview(agentSuggestion);
    }

    return {
      conversationId,
      requirementsCreated,
      tasksCreated,
      agentSuggestion,
      status: needsHumanReview ? 'needs_review' : 'auto_handled',
    };
  }

  /**
   * 完成所有Task并关闭Conversation
   *
   * 流程：
   * 1. 检查所有Task是否完成
   * 2. AI生成总结
   * 3. 关闭Conversation
   * 4. 通知客户（TODO: IM集成）
   * 5. 知识库沉淀（TODO: Phase 3）
   */
  async completeConversation(conversationId: string): Promise<{
    success: boolean;
    summary: string;
    incompleteTasks: string[];
  }> {
    // Step 1: 检查所有Task是否完成
    const allTasks = await this.taskRepository.findByFilters({ conversationId });

    const incompleteTasks = allTasks
      .filter((task) => {
        const status = task.status;
        return status !== 'completed' && status !== 'cancelled';
      })
      .map((task) => task.id);

    if (incompleteTasks.length > 0) {
      return {
        success: false,
        summary: '',
        incompleteTasks,
      };
    }

    // Step 2: AI生成总结
    const summary = await this.aiService.summarizeConversation(conversationId);

    // Step 3: 关闭Conversation
    await this.closeConversationUseCase.execute({
      conversationId,
      closedBy: 'system',
      reason: summary,
    });

    // Step 4: 通知客户（Phase 2实现）
    // await this.notifyCustomer(conversationId, summary);

    // Step 5: 知识库沉淀（Phase 3实现）
    // await this.extractKnowledge(conversationId);

    return {
      success: true,
      summary,
      incompleteTasks: [],
    };
  }

  /**
   * 为内部需求创建Conversation（如需要）
   *
   * 用于内部发起的问题，判断是否需要通知客户
   */
  async createConversationForRequirement(requirementId: string): Promise<{
    conversationId?: string;
    needsCustomerCommunication: boolean;
    reason: string;
  }> {
    // Step 1: 获取Requirement
    const requirement = await this.requirementRepository.findById(requirementId);
    if (!requirement) {
      throw new Error(`Requirement ${requirementId} not found`);
    }

    // Step 2: 判断是否需要客户沟通
    const needsCommunication = this.requiresCustomerCommunication(requirement);

    if (!needsCommunication.needed) {
      return {
        needsCustomerCommunication: false,
        reason: needsCommunication.reason,
      };
    }

    // Step 3: 创建Conversation
    const conversation = await this.createConversationUseCase.execute({
      customerId: requirement.customerId,
      channel: 'internal', // 内部发起
      priority: requirement.priority.value as 'low' | 'normal' | 'high',
      initialMessage: {
        senderId: 'system',
        senderType: 'internal',
        content: `关于您的需求：${requirement.title}`,
      },
    });

    // Step 4: 关联Requirement
    // TODO: 更新Requirement的conversationId（需要UpdateRequirementUseCase）

    return {
      conversationId: conversation.id,
      needsCustomerCommunication: true,
      reason: needsCommunication.reason,
    };
  }

  /**
   * 分析消息中的需求
   */
  private async analyzeRequirements(content: string): Promise<RequirementAnalysis[]> {
    // Phase 1: 使用简单的规则检测
    const detection = this.requirementDetector.detect(content);

    // 简单启发式：检测是否包含需求关键词
    const hasRequirementKeywords = [
      '需要',
      '希望',
      '想要',
      '能不能',
      '可以',
      '功能',
      '添加',
      '修改',
    ].some((keyword) => content.includes(keyword));

    if (!hasRequirementKeywords) {
      return [];
    }

    // 生成需求分析结果
    const analysis: RequirementAnalysis = {
      title: this.extractTitle(content),
      description: content,
      category: detection.category,
      priority: detection.priority,
      confidence: 0.8, // Phase 1简单置信度
      source: 'conversation',
    };

    return [analysis];

    // TODO Phase 2: 调用LLM进行智能需求提取
    // const aiAnalysis = await this.aiService.extractRequirements(content);
    // return aiAnalysis.requirements;
  }

  /**
   * Agent生成回复
   * 使用LLM结合情绪、知识库、对话历史生成智能回复
   */
  private async generateAgentReply(
    conversationId: string,
    userMessage: string,
    requirements: RequirementAnalysis[],
  ): Promise<string> {
    try {
      // 1. 获取对话历史
      const conversation = await this.conversationRepository.findById(conversationId);
      const conversationHistory = conversation?.messages?.map((msg: any) => ({
        role: msg.senderType === 'external' ? 'customer' : 'agent',
        content: msg.content,
      })) || [];

      // 2. 分析情绪
      const sentiment = await this.aiService.analyzeSentiment(
        userMessage,
        conversationHistory,
      );

      // 3. 查询知识库
      const knowledgeItems = await this.getRelatedKnowledge(userMessage);

      // 4. 使用LLM生成回复
      const llmClient = (this.aiService as any).llmClient;
      if (llmClient && llmClient.isEnabled()) {
        const result = await llmClient.generateReply(
          userMessage,
          sentiment,
          knowledgeItems,
          conversationHistory.slice(-5), // 只传最近5条
        );
        return result.suggestedReply;
      }

      // 降级方案：模板回复
      return this.fallbackGenerateReply(userMessage, sentiment, requirements, knowledgeItems);
    } catch (error) {
      console.warn('[ConversationTaskCoordinator] 生成回复失败，使用降级方案:', error);
      return this.fallbackGenerateReply(userMessage, { overallSentiment: 'neutral' } as any, requirements, []);
    }
  }

  /**
   * 降级方案：模板回复
   */
  private fallbackGenerateReply(
    _userMessage: string,
    sentiment: any,
    requirements: RequirementAnalysis[],
    knowledgeItems: any[],
  ): string {
    let reply = '';

    // 根据情绪调整开头
    if (sentiment.overallSentiment === 'negative') {
      reply = '非常抱歉给您带来不便！我们理解您的困扰，会尽快帮您解决。\n\n';
    } else if (sentiment.overallSentiment === 'positive') {
      reply = '感谢您的反馈！很高兴能为您提供帮助。\n\n';
    } else {
      reply = '您好！我已收到您的消息。\n\n';
    }

    // 如果有需求，说明已创建工单
    if (requirements.length > 0) {
      const reqList = requirements.map((r, i) => `${i + 1}. ${r.title}`).join('\n');
      reply += `我理解您的需求：\n${reqList}\n\n`;
      reply += '我已为您记录相关信息，工程师会尽快处理。';
    } else {
      reply += '正在为您查询相关信息，请稍候。';
    }

    // 如果有知识库推荐，添加链接
    if (knowledgeItems.length > 0) {
      reply += '\n\n您也可以参考以下文档：\n';
      knowledgeItems.slice(0, 2).forEach((item, i) => {
        reply += `${i + 1}. [${item.title}](${item.url})\n`;
      });
    }

    return reply;
  }

  /**
   * 获取相关知识库
   */
  private async getRelatedKnowledge(query: string): Promise<Array<{ title: string; content?: string; url: string }>> {
    try {
      // 这里可以用LLM提取关键词，暂时用简单方法
      const knowledgeItems = await (this.aiService as any).knowledgeRepository.findByFilters({}, { limit: 10, offset: 0 });

      // 简单匹配：标题包含查询词
      const baseUrl = 'http://localhost:3000'; // TODO: 从config获取
      return knowledgeItems
        .filter((item: any) => {
          const queryWords = query.split(/\s+/);
          return queryWords.some(word => item.title.includes(word) || item.tags?.includes(word));
        })
        .slice(0, 3)
        .map((item: any) => ({
          title: item.title,
          content: item.content?.substring(0, 200),
          url: `${baseUrl}/knowledge/${item.id}`,
        }));
    } catch (error) {
      console.warn('[ConversationTaskCoordinator] 查询知识库失败:', error);
      return [];
    }
  }

  /**
   * 判断是否需要人工审核
   */
  private shouldRequireHumanReview(context: {
    confidence: number;
    hasRequirements: boolean;
    tasksCreated: number;
  }): boolean {
    // Rule 1: 低置信度需要人工审核
    if (context.confidence < 0.8) {
      return true;
    }

    // Rule 2: 创建了多个Task，需要人工确认
    if (context.tasksCreated > 2) {
      return true;
    }

    // Rule 3: 没有检测到需求但消息较长，可能遗漏
    if (!context.hasRequirements && context.confidence < 0.9) {
      return true;
    }

    return false;
  }

  /**
   * 判断Requirement是否需要客户沟通
   */
  private requiresCustomerCommunication(requirement: any): {
    needed: boolean;
    reason: string;
  } {
    // Rule 1: 来自客户的需求，已有沟通渠道
    if (requirement.source.value === 'conversation') {
      return {
        needed: false,
        reason: '需求来自对话，已有沟通渠道',
      };
    }

    // Rule 2: 高优先级需求，需要确认细节
    if (
      requirement.priority.value === 'high' ||
      requirement.priority.value === 'urgent'
    ) {
      return {
        needed: true,
        reason: '高优先级需求，需要与客户确认细节',
      };
    }

    // Rule 3: 技术类需求，可能需要客户配合测试
    if (requirement.category === 'technical') {
      return {
        needed: true,
        reason: '技术类需求，可能需要客户配合测试',
      };
    }

    // Rule 4: 其他情况，暂不需要
    return {
      needed: false,
      reason: '内部需求，暂无需客户沟通',
    };
  }

  /**
   * 通知人工审核
   */
  private async notifyHumanReview(suggestion: AgentSuggestion): Promise<void> {
    // Phase 1: 简单日志输出
    console.log('[ConversationTaskCoordinator] 需要人工审核:', {
      conversationId: suggestion.conversationId,
      confidence: suggestion.confidence,
      requirementsCount: suggestion.detectedRequirements.length,
      tasksCount: suggestion.recommendedTasks.length,
    });

    // TODO Phase 2: 通过WebSocket推送到前端审核面板
    // await this.websocketService.emit('agent:review_request', suggestion);

    // TODO Phase 2: 或通过EventBus发布事件
    // await this.eventBus.publish(new AgentReviewRequestedEvent({...}));
  }

  /**
   * 提取标题（简单实现）
   */
  private extractTitle(content: string): string {
    // 取前50个字符作为标题
    const title = content.substring(0, 50);
    return title.length < content.length ? `${title}...` : title;
  }

  /**
   * Phase 2: 处理ConversationClosedEvent，触发InspectorAgent异步质检
   *
   * 工作流程：
   * 1. 从事件中提取conversationId
   * 2. 调用AgentScope服务的/api/agents/inspect接口
   * 3. 异步执行，不阻塞对话关闭流程
   * 4. InspectorAgent将自动保存质检报告、创建调研等
   */
  private async handleConversationClosed(event: ConversationClosedEvent): Promise<void> {
    const conversationId = event.conversationId;

    console.log(`[ConversationTaskCoordinator] Triggering quality inspection for conversation: ${conversationId}`);

    try {
      // 调用AgentScope服务的质检接口
      const agentscopeUrl = config.agentscope.serviceUrl;
      const inspectUrl = `${agentscopeUrl}/api/agents/inspect`;

      const response = await fetch(inspectUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
        }),
        signal: AbortSignal.timeout(config.agentscope.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AgentScope API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      console.log(`[ConversationTaskCoordinator] Quality inspection completed for conversation ${conversationId}:`, {
        success: result.success,
        quality_score: result.quality_score,
      });

      // 可选：根据质检结果触发进一步动作
      if (result.quality_score < 70) {
        console.warn(`[ConversationTaskCoordinator] Low quality score (${result.quality_score}) detected for conversation ${conversationId}`);
        // TODO: 发送告警通知管理员
      }
    } catch (error) {
      // 异步质检失败不影响对话关闭流程
      console.error(`[ConversationTaskCoordinator] Failed to trigger quality inspection for conversation ${conversationId}:`, error);
    }
  }

  /**
   * 通知客户（Phase 2实现）
   */
  // private async notifyCustomer(conversationId: string, summary: string): Promise<void> {
  //   const conversation = await this.conversationRepository.findById(conversationId);
  //   if (!conversation) return;
  //
  //   // 根据channel选择IM适配器
  //   const channel = conversation.channel.value;
  //   if (channel === 'feishu') {
  //     await this.feishuAdapter.sendMessage(conversation.customerId, summary);
  //   } else if (channel === 'wecom') {
  //     await this.wecomAdapter.sendMessage(conversation.customerId, summary);
  //   }
  // }

  /**
   * 知识库沉淀（Phase 3实现）
   */
  // private async extractKnowledge(conversationId: string): Promise<void> {
  //   const conversation = await this.conversationRepository.findById(conversationId);
  //   if (!conversation) return;
  //
  //   // AI提取QA对
  //   const qaPairs = await this.aiService.extractQAPairs(conversation.messages);
  //
  //   // 保存到知识库
  //   for (const qa of qaPairs) {
  //     if (qa.confidence > 0.8) {
  //       await this.knowledgeService.create({...});
  //     }
  //   }
  // }
}
