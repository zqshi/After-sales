/**
 * ActionStepExecutor - 默认动作执行器
 *
 * 支持的动作：
 * - classify: 分类（调用OrchestratorAgent）
 * - send_message: 发送消息
 * - create_task: 创建任务
 * - create_requirement: 创建需求
 * - close_conversation: 关闭对话
 * - custom: 自定义动作（需要注册）
 */

import { BaseStepExecutor } from './BaseStepExecutor';
import { WorkflowStep, WorkflowContext } from '../types';
import { SendMessageUseCase } from '@application/use-cases/SendMessageUseCase';
import { CreateTaskUseCase } from '@application/use-cases/task/CreateTaskUseCase';
import { CreateRequirementUseCase } from '@application/use-cases/requirement/CreateRequirementUseCase';
import { CloseConversationUseCase } from '@application/use-cases/CloseConversationUseCase';
import { SearchKnowledgeUseCase } from '@application/use-cases/knowledge/SearchKnowledgeUseCase';
import { CreateReviewRequestUseCase } from '@application/use-cases/review/CreateReviewRequestUseCase';
import { AiService } from '@application/services/AiService';
import { RequirementDetectorService } from '@domain/requirement/services/RequirementDetectorService';
import { ConversationRepository } from '@infrastructure/repositories/ConversationRepository';

export interface ActionExecutorDependencies {
  sendMessageUseCase?: SendMessageUseCase;
  createTaskUseCase?: CreateTaskUseCase;
  createRequirementUseCase?: CreateRequirementUseCase;
  closeConversationUseCase?: CloseConversationUseCase;
  searchKnowledgeUseCase?: SearchKnowledgeUseCase;
  aiService?: AiService;
  conversationRepository?: ConversationRepository;
  createReviewRequestUseCase?: CreateReviewRequestUseCase;
  mode?: 'analysis_only' | 'full';
}

export class ActionStepExecutor extends BaseStepExecutor {
  // 自定义动作处理器注册表
  private customActions: Map<string, (input: any, context: WorkflowContext) => Promise<any>> =
    new Map();
  private readonly deps: ActionExecutorDependencies;
  private readonly requirementDetector = new RequirementDetectorService();

  constructor(deps: ActionExecutorDependencies = {}) {
    super();
    this.deps = deps;
  }

  /**
   * 注册自定义动作
   */
  registerAction(
    name: string,
    handler: (input: any, context: WorkflowContext) => Promise<any>,
  ): void {
    this.customActions.set(name, handler);
  }

  /**
   * 判断是否支持
   */
  supports(step: WorkflowStep): boolean {
    // 支持所有action类型步骤
    return !step.type || step.type === 'action';
  }

  /**
   * 执行步骤
   */
  async execute(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    await this.beforeExecute(step, context);

    try {
      const result = await this.executeAction(step, context);
      await this.afterExecute(step, context, result);
      return result;
    } catch (err) {
      await this.onError(step, context, err as Error);
      throw err;
    }
  }

  /**
   * 执行具体动作
   */
  private async executeAction(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const action = step.action;

    if (!action) {
      throw new Error(`Step ${step.name} has no action specified`);
    }

    // 检查是否是自定义动作
    if (this.customActions.has(action)) {
      const handler = this.customActions.get(action)!;
      return await handler(step.input, context);
    }

    // 内置动作
    switch (action) {
      case 'classify':
        return await this.handleClassify(step, context);

      case 'classify_intent':
        return await this.handleClassifyIntent(step, context);

      case 'get_conversation_context':
        return await this.handleGetConversationContext(step, context);

      case 'escalate_to_human':
        return await this.handleEscalateToHuman(step, context);

      case 'send_message':
        return await this.handleSendMessage(step, context);

      case 'create_task':
        return await this.handleCreateTask(step, context);

      case 'create_technical_ticket':
        return await this.handleCreateTechnicalTicket(step, context);

      case 'create_requirement':
        return await this.handleCreateRequirement(step, context);

      case 'close_conversation':
        return await this.handleCloseConversation(step, context);

      case 'diagnose_fault':
        return await this.handleDiagnoseFault(step, context);

      case 'classify_issue':
        return await this.handleClassifyIssue(step, context);

      case 'analyze_logs':
        return await this.handleAnalyzeLogs(step, context);

      case 'recommend_solution':
        return await this.handleRecommendSolution(step, context);

      case 'estimate_resolution_time':
        return await this.handleEstimateResolutionTime(step, context);

      case 'check_compliance':
        return await this.handleCheckCompliance(step, context);

      case 'detect_violations':
        return await this.handleDetectViolations(step, context);

      case 'compare_team_performance':
        return await this.handleCompareTeamPerformance(step, context);

      case 'inspect_conversation':
        return await this.handleInspectConversation(step, context);

      case 'generate_quality_report':
        return await this.handleGenerateQualityReport(step, context);

      case 'log':
        return await this.handleLog(step, context);

      case 'wait':
        return await this.handleWait(step, context);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * 处理classify动作
   */
  private async handleClassify(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    console.log(`[ActionExecutor] Classifying message (agent: ${step.agent})`);

    const input = step.input ?? {};
    const content =
      (typeof input === 'string' ? input : input.content || input.message || '') || '';
    const aiService = this.deps.aiService;
    const llmClient = (aiService as any)?.llmClient;
    const normalized = String(content).toLowerCase();
    const emergencyHit =
      normalized.includes('urgent') ||
      normalized.includes('紧急') ||
      normalized.includes('无法') ||
      normalized.includes('崩溃') ||
      normalized.includes('宕机');

    if (step.agent === 'sentiment_analyzer' && aiService) {
      const sentiment = await aiService.analyzeSentiment(String(content));
      return {
        sentiment: sentiment.overallSentiment,
        score: sentiment.score,
        confidence: sentiment.confidence,
      };
    }

    if (step.agent === 'knowledge_manager' && this.deps.searchKnowledgeUseCase) {
      const query =
        (typeof input === 'object' && (input.query || input.message?.content)) || content;
      const results = await this.deps.searchKnowledgeUseCase.execute({
        query: String(query || ''),
        mode: 'keyword',
        filters: { limit: 5 },
      });
      return {
        items: results,
        count: results.length,
      };
    }

    if (step.agent === 'requirement_collector') {
      const message = String(content);
      const detection = this.requirementDetector.detect(message);
      const keywords = ['需要', '希望', '想要', '能不能', '可以', '功能', '添加', '修改', '请求', '申请'];
      const hasRequirement = keywords.some((keyword) => message.includes(keyword));
      return {
        requirements: hasRequirement
          ? [
              {
                title: message.substring(0, 50),
                description: message,
                category: detection.category,
                priority: detection.priority,
                confidence: 0.75,
              },
            ]
          : [],
      };
    }

    if (step.agent === 'customer_service') {
      const sentiment = aiService
        ? await aiService.analyzeSentiment(String(content))
        : { overallSentiment: 'neutral', score: 0.5, confidence: 0.5 };
      const knowledgeItems = Array.isArray(input.knowledge?.items)
        ? input.knowledge.items
        : Array.isArray(input.knowledge)
          ? input.knowledge
          : [];

      if (llmClient && llmClient.isEnabled()) {
        const reply = await llmClient.generateReply(
          String(content),
          sentiment,
          knowledgeItems,
        );
        return {
          reply: reply.suggestedReply,
          confidence: reply.confidence ?? 0.7,
          trace: [
            { type: 'thought', content: '分析情绪与知识库结果以生成回复建议' },
            { type: 'action', content: '调用LLM生成回复' },
            { type: 'observation', content: `情绪=${sentiment.overallSentiment}` },
          ],
        };
      }

      return {
        reply: '已收到您的问题，我们会尽快回复。',
        confidence: 0.55,
        trace: [
          { type: 'thought', content: 'LLM不可用或失败，返回业务型提示' },
          { type: 'action', content: '返回业务型提示' },
          { type: 'observation', content: 'LLM不可用或失败' },
        ],
      };
    }

    if (step.agent === 'fault_agent') {
      const message = String(content);
      if (step.name === 'check_completeness') {
        const isComplete = message.length > 10;
        return {
          is_complete: isComplete,
          missing_fields: isComplete ? [] : ['error_message', 'impact_scope'],
          questions: isComplete ? [] : ['请提供报错信息', '请说明影响范围'],
        };
      }
      if (step.name === 'assess_severity') {
        const severity = emergencyHit ? 'P0' : 'P2';
        return {
          severity,
          priority: severity === 'P0' ? 'urgent' : 'high',
          should_create_task: true,
        };
      }
      if (step.name === 'diagnose') {
        return {
          summary: message.substring(0, 80),
          root_cause: 'unknown',
        };
      }
      if (step.name === 'generate_solution') {
        return {
          customer_reply: '我们已收到故障信息，正在排查处理中。',
          steps: ['确认错误信息', '收集日志', '安排技术排查'],
        };
      }
      return {
        title: message.substring(0, 50),
        error_message: message,
        fault_type: 'unknown',
        signature: message.substring(0, 20),
        severity: 'P2',
        is_complete: true,
        should_create_task: true,
        priority: 'high',
        summary: message.substring(0, 80),
        customer_reply: '我们已收到故障信息，正在排查处理中。',
      };
    }

    if (step.agent === 'requirement_agent') {
      const message = typeof input === 'string' ? input : JSON.stringify(input);
      if (step.name === 'assess_priority') {
        return {
          priority: emergencyHit ? 'urgent' : 'medium',
          confidence: emergencyHit ? 0.9 : 0.65,
        };
      }
      if (step.name === 'feasibility_analysis') {
        return {
          is_feasible: true,
          risks: [],
        };
      }
      if (step.name === 'task_breakdown') {
        return {
          task_list: [
            {
              title: `需求拆分: ${message.substring(0, 30)}`,
              priority: 'medium',
              description: message.substring(0, 100),
              estimatedHours: 4,
            },
          ],
        };
      }
      if (step.name === 'smart_assignment') {
        return {
          assignments: [],
        };
      }
      return {
        priority: 'medium',
        is_feasible: true,
        task_list: [
          {
            title: `需求拆分: ${message.substring(0, 30)}`,
            priority: 'medium',
            description: message.substring(0, 100),
            estimatedHours: 4,
          },
        ],
      };
    }

    // 默认Orchestrator分类
    let intentInfo: any = null;
    if (llmClient && llmClient.isEnabled()) {
      try {
        intentInfo = await llmClient.extractIntent(String(content));
      } catch (err) {
        console.warn('[ActionExecutor] LLM意图提取失败，使用规则兜底', err);
      }
    }

    const urgent = emergencyHit;
    const route =
      intentInfo?.intent === 'complaint' || intentInfo?.intent === 'feedback'
        ? 'assistant'
        : intentInfo?.intent === 'urgent' || urgent
          ? 'engineer'
          : 'assistant';

    return {
      message_type: intentInfo?.intent || (urgent ? 'urgent' : 'consultation'),
      priority: urgent ? 'high' : 'medium',
      sentiment: intentInfo?.sentiment || 'neutral',
      confidence: intentInfo?.confidence ?? 0.6,
      keywords: intentInfo?.keywords ?? [],
      detectEmergency: urgent,
      routeToAgent: route,
      recommendNextAction: urgent ? 'escalate_to_human' : 'reply_with_suggestion',
      trace: [
        { type: 'thought', content: '识别意图并决定路由' },
        { type: 'action', content: `routeToAgent=${route}` },
        { type: 'observation', content: `urgent=${urgent}` },
      ],
    };
  }

  private async handleClassifyIntent(step: WorkflowStep, _context: WorkflowContext): Promise<any> {
    const input = step.input ?? {};
    const content =
      (typeof input === 'string' ? input : input.content || input.message || '') || '';
    const aiService = this.deps.aiService;
    const llmClient = (aiService as any)?.llmClient;
    if (llmClient && llmClient.isEnabled()) {
      return llmClient.extractIntent(String(content));
    }
    return {
      isQuestion: String(content).includes('?') || String(content).includes('？'),
      intent: 'inquiry',
      keywords: [],
      entities: {},
      confidence: 0.5,
    };
  }

  private async handleGetConversationContext(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const repo = this.deps.conversationRepository;
    if (!repo) {
      throw new Error('conversationRepository is required for get_conversation_context');
    }
    const input = step.input || {};
    const conversationId =
      input.conversationId || context.variables?.conversation?.id;
    if (!conversationId) {
      throw new Error('conversationId is required for get_conversation_context');
    }
    const limit = typeof input.limit === 'number' ? Math.max(1, Math.floor(input.limit)) : 10;
    const conversation = await repo.findById(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    const messages = conversation.messages.slice(-limit).map((msg) => ({
      role: msg.senderType === 'customer' ? 'customer' : 'agent',
      senderId: msg.senderId,
      senderType: msg.senderType,
      content: msg.content,
      timestamp: msg.sentAt.toISOString(),
    }));
    return {
      conversation: {
        id: conversation.id,
        customerId: conversation.customerId,
        status: conversation.status.value,
        channel: conversation.channel.value,
        priority: conversation.priority.value,
      },
      messages,
    };
  }

  private async handleEscalateToHuman(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const input = step.input || {};
    const conversationId =
      input.conversationId || context.variables?.conversation?.id;
    if (!conversationId) {
      throw new Error('conversationId is required for escalate_to_human');
    }
    if (this.deps.mode !== 'full' || !this.deps.createReviewRequestUseCase) {
      return {
        reviewRequestId: `review-dry-${Date.now()}`,
        conversationId,
        dryRun: true,
      };
    }
    const review = await this.deps.createReviewRequestUseCase.execute({
      conversationId,
      suggestion: input.suggestion || input,
      confidence: typeof input.confidence === 'number' ? input.confidence : undefined,
    });
    return {
      reviewRequestId: review.id,
      conversationId,
    };
  }

  /**
   * 处理send_message动作
   */
  private async handleSendMessage(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    console.log(`[ActionExecutor] Sending message to channel: ${step.channel}`);

    if (this.deps.mode !== 'full' || !this.deps.sendMessageUseCase) {
      return {
        success: true,
        channel: step.channel,
        content: step.content,
        sentAt: new Date().toISOString(),
        dryRun: true,
      };
    }

    const conversationId =
      step.input?.conversationId || context.variables?.conversation?.id;
    const content =
      step.content || step.input?.content || step.input?.message || '';

    if (!conversationId) {
      throw new Error('conversationId is required for send_message');
    }

    return this.deps.sendMessageUseCase.execute({
      conversationId,
      senderId: 'system',
      senderType: 'internal',
      content: String(content),
      metadata: { channel: step.channel },
    });
  }

  /**
   * 处理create_task动作
   */
  private async handleCreateTask(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    console.log(`[ActionExecutor] Creating task with input:`, step.input);

    if (this.deps.mode !== 'full' || !this.deps.createTaskUseCase) {
      return {
        taskId: `task-dry-${Date.now()}`,
        title: step.input?.title || 'Untitled Task',
        status: 'pending',
        createdAt: new Date().toISOString(),
        dryRun: true,
      };
    }

    const input = step.input || {};
    return this.deps.createTaskUseCase.execute({
      title: input.title || 'Untitled Task',
      type: input.type || 'support',
      assigneeId: input.assigneeId,
      conversationId:
        input.conversationId || context.variables?.conversation?.id,
      requirementId: input.requirementId,
      priority: input.priority,
      dueDate: input.dueDate,
      metadata: input.metadata,
    });
  }

  private async handleCreateTechnicalTicket(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const input = step.input || {};
    return this.handleCreateTask(
      {
        ...step,
        input: {
          ...input,
          type: 'technical',
          title: input.title || 'Technical Ticket',
        },
      },
      context,
    );
  }

  /**
   * 处理create_requirement动作
   */
  private async handleCreateRequirement(
    step: WorkflowStep,
    context: WorkflowContext,
  ): Promise<any> {
    console.log(`[ActionExecutor] Creating requirement with input:`, step.input);

    if (this.deps.mode !== 'full' || !this.deps.createRequirementUseCase) {
      return {
        requirementId: `req-dry-${Date.now()}`,
        title: step.input?.title || 'Untitled Requirement',
        category: step.input?.category || 'general',
        priority: step.input?.priority || 'medium',
        createdAt: new Date().toISOString(),
        dryRun: true,
      };
    }

    const input = step.input || {};
    const customerId =
      input.customerId || context.variables?.conversation?.customerId;
    if (!customerId) {
      throw new Error('customerId is required for create_requirement');
    }

    return this.deps.createRequirementUseCase.execute({
      customerId,
      conversationId: input.conversationId || context.variables?.conversation?.id,
      title: input.title || 'Untitled Requirement',
      description: input.description || input.content || '',
      category: input.category || 'general',
      priority: input.priority,
      source: 'conversation',
      createdBy: 'system',
      metadata: input.metadata,
    });
  }

  /**
   * 处理close_conversation动作
   */
  private async handleCloseConversation(
    step: WorkflowStep,
    context: WorkflowContext,
  ): Promise<any> {
    console.log(`[ActionExecutor] Closing conversation:`, step.input?.conversationId);

    if (this.deps.mode !== 'full' || !this.deps.closeConversationUseCase) {
      return {
        conversationId: step.input?.conversationId,
        closedAt: new Date().toISOString(),
        resolution: step.input?.resolution || 'Completed',
        dryRun: true,
      };
    }

    const conversationId =
      step.input?.conversationId || context.variables?.conversation?.id;
    if (!conversationId) {
      throw new Error('conversationId is required for close_conversation');
    }
    await this.deps.closeConversationUseCase.execute({
      conversationId,
      closedBy: 'system',
      reason: step.input?.resolution || 'Completed',
    });
    return {
      conversationId,
      closedAt: new Date().toISOString(),
      resolution: step.input?.resolution || 'Completed',
    };
  }

  private async handleDiagnoseFault(step: WorkflowStep, _context: WorkflowContext): Promise<any> {
    const input = step.input ?? {};
    const description =
      (typeof input === 'string' ? input : input.description || input.message || '') || '';
    const aiService = this.deps.aiService;
    if (!aiService) {
      return { summary: String(description).substring(0, 120), root_cause: 'unknown' };
    }
    const classification = await aiService.classifyIssue(String(description));
    const solution = await aiService.recommendSolution(String(description));
    const estimate = await aiService.estimateResolutionTime(classification.severity);
    return {
      severity: classification.severity,
      summary: String(description).substring(0, 120),
      root_cause: classification.category,
      solution_steps: solution.steps,
      temporary_solution: solution.temporary_solution,
      estimated_time: estimate.estimate,
    };
  }

  private async handleClassifyIssue(step: WorkflowStep, _context: WorkflowContext): Promise<any> {
    const input = step.input ?? {};
    const content = (typeof input === 'string' ? input : input.content || '') || '';
    if (!this.deps.aiService) {
      return { issue_type: 'inquiry', category: 'service', severity: 'P3', confidence: 0.5 };
    }
    return this.deps.aiService.classifyIssue(String(content));
  }

  private async handleAnalyzeLogs(step: WorkflowStep, _context: WorkflowContext): Promise<any> {
    const input = step.input ?? {};
    const logs = (typeof input === 'string' ? input : input.logs || '') || '';
    if (!this.deps.aiService) {
      return { summary: 'no ai service', error_signatures: [], root_cause: 'unknown' };
    }
    return this.deps.aiService.analyzeLogs(String(logs));
  }

  private async handleRecommendSolution(step: WorkflowStep, _context: WorkflowContext): Promise<any> {
    const input = step.input ?? {};
    const issue = (typeof input === 'string' ? input : input.issue || '') || '';
    if (!this.deps.aiService) {
      return { steps: [], temporary_solution: 'no ai service' };
    }
    return this.deps.aiService.recommendSolution(String(issue));
  }

  private async handleEstimateResolutionTime(step: WorkflowStep, _context: WorkflowContext): Promise<any> {
    const input = step.input ?? {};
    const severity = (typeof input === 'string' ? input : input.severity || '') || '';
    if (!this.deps.aiService) {
      return { estimate: '待评估' };
    }
    return this.deps.aiService.estimateResolutionTime(String(severity));
  }

  private async handleCheckCompliance(step: WorkflowStep, _context: WorkflowContext): Promise<any> {
    const input = step.input ?? {};
    const content = (typeof input === 'string' ? input : input.content || '') || '';
    if (!this.deps.aiService) {
      return { compliant: true, issues: [] };
    }
    return this.deps.aiService.checkCompliance(String(content));
  }

  private async handleDetectViolations(step: WorkflowStep, _context: WorkflowContext): Promise<any> {
    const input = step.input ?? {};
    const content = (typeof input === 'string' ? input : input.content || '') || '';
    if (!this.deps.aiService) {
      return { violations: [] };
    }
    return this.deps.aiService.detectViolations(String(content));
  }

  private async handleCompareTeamPerformance(step: WorkflowStep, _context: WorkflowContext): Promise<any> {
    const input = step.input ?? {};
    const reports = Array.isArray(input.reports) ? input.reports : [];
    if (!this.deps.aiService) {
      return { averages: {}, overall: 0 };
    }
    const normalized = reports
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry: any) => ({
        teamId: String(entry.teamId ?? 'unknown'),
        qualityScore: typeof entry.qualityScore === 'number' ? entry.qualityScore : undefined,
      }));
    return this.deps.aiService.compareTeamPerformance(normalized);
  }

  private async handleInspectConversation(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const input = step.input ?? {};
    const conversationId = input.conversationId || context.variables?.conversation?.id;
    if (!conversationId) {
      throw new Error('conversationId is required for inspect_conversation');
    }
    const aiService = this.deps.aiService;
    if (!aiService) {
      return { conversationId, summary: 'ai disabled' };
    }
    return aiService.analyzeConversation({
      conversationId,
      context: 'quality',
      options: { includeHistory: true, depth: 'detailed' },
    });
  }

  private async handleGenerateQualityReport(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    return this.handleInspectConversation(step, context);
  }

  /**
   * 处理log动作
   */
  private async handleLog(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const message = step.content || step.input;
    console.log(`[Workflow Log] ${message}`);
    return { logged: true };
  }

  /**
   * 处理wait动作
   */
  private async handleWait(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const duration = step.input?.duration || step.timeout || 1000;
    console.log(`[ActionExecutor] Waiting for ${duration}ms`);
    await new Promise((resolve) => setTimeout(resolve, duration));
    return { waited: duration };
  }
}
