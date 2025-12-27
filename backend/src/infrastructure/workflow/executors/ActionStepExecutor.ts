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

export class ActionStepExecutor extends BaseStepExecutor {
  // 自定义动作处理器注册表
  private customActions: Map<string, (input: any, context: WorkflowContext) => Promise<any>> =
    new Map();

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

      case 'send_message':
        return await this.handleSendMessage(step, context);

      case 'create_task':
        return await this.handleCreateTask(step, context);

      case 'create_requirement':
        return await this.handleCreateRequirement(step, context);

      case 'close_conversation':
        return await this.handleCloseConversation(step, context);

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

    // Phase 1: 模拟实现
    // Phase 2: 调用真实的OrchestratorAgent
    return {
      message_type: 'consultation',
      priority: 'medium',
      sentiment: 'neutral',
      confidence: 0.85,
    };
  }

  /**
   * 处理send_message动作
   */
  private async handleSendMessage(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    console.log(`[ActionExecutor] Sending message to channel: ${step.channel}`);

    // Phase 1: 仅日志
    // Phase 2: 调用IMGatewayService
    return {
      success: true,
      channel: step.channel,
      content: step.content,
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * 处理create_task动作
   */
  private async handleCreateTask(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    console.log(`[ActionExecutor] Creating task with input:`, step.input);

    // Phase 1: 模拟实现
    // Phase 2: 调用CreateTaskUseCase
    return {
      taskId: `task-${Date.now()}`,
      title: step.input?.title || 'Untitled Task',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 处理create_requirement动作
   */
  private async handleCreateRequirement(
    step: WorkflowStep,
    context: WorkflowContext,
  ): Promise<any> {
    console.log(`[ActionExecutor] Creating requirement with input:`, step.input);

    // Phase 1: 模拟实现
    // Phase 2: 调用CreateRequirementUseCase
    return {
      requirementId: `req-${Date.now()}`,
      title: step.input?.title || 'Untitled Requirement',
      category: step.input?.category || 'general',
      priority: step.input?.priority || 'medium',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 处理close_conversation动作
   */
  private async handleCloseConversation(
    step: WorkflowStep,
    context: WorkflowContext,
  ): Promise<any> {
    console.log(`[ActionExecutor] Closing conversation:`, step.input?.conversationId);

    // Phase 1: 模拟实现
    // Phase 2: 调用CloseConversationUseCase
    return {
      conversationId: step.input?.conversationId,
      closedAt: new Date().toISOString(),
      resolution: step.input?.resolution || 'Completed',
    };
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
