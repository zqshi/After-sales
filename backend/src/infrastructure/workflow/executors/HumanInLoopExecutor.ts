/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
/**
 * HumanInLoopExecutor - 人工干预执行器
 *
 * 在工作流中插入人工审核点，等待人工决策后继续
 */

import { EventEmitter } from 'events';

import { WorkflowStep, WorkflowContext, HumanInLoopRequest, HumanInLoopResponse } from '../types';

import { BaseStepExecutor } from './BaseStepExecutor';

export class HumanInLoopExecutor extends BaseStepExecutor {
  private eventEmitter: EventEmitter;
  private pendingRequests: Map<string, HumanInLoopRequest> = new Map();

  constructor(eventEmitter?: EventEmitter) {
    super();
    this.eventEmitter = eventEmitter || new EventEmitter();
  }

  /**
   * 判断是否支持
   */
  supports(step: WorkflowStep): boolean {
    return step.type === 'human_in_loop';
  }

  /**
   * 执行步骤
   */
  async execute(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    await this.beforeExecute(step, context);

    try {
      // 创建人工审核请求
      const request: HumanInLoopRequest = {
        executionId: context.executionId,
        workflowName: context.workflowName,
        stepName: step.name,
        requestedAt: new Date(),
        timeout: step.timeout || 300000, // 默认5分钟
        data: step.input,
        options: {
          approve: true,
          reject: true,
          modify: true,
        },
      };

      // 保存待处理请求
      const requestKey = `${context.executionId}:${step.name}`;
      this.pendingRequests.set(requestKey, request);

      // 发出人工审核事件
      this.eventEmitter.emit('human_review_requested', request);
      console.log(`[HumanInLoop] Waiting for human review: ${step.name}`);

      // 等待人工响应
      const response = await this.waitForHumanResponse(requestKey, request.timeout);

      // 清理待处理请求
      this.pendingRequests.delete(requestKey);

      // 处理响应
      const result = this.handleResponse(response, step);

      await this.afterExecute(step, context, result);
      return result;
    } catch (err) {
      await this.onError(step, context, err as Error);
      throw err;
    }
  }

  /**
   * 等待人工响应
   */
  private async waitForHumanResponse(
    requestKey: string,
    timeout: number,
  ): Promise<HumanInLoopResponse> {
    return new Promise((resolve, reject) => {
      // 设置超时
      const timeoutId = setTimeout(() => {
        this.eventEmitter.removeAllListeners(`human_response:${requestKey}`);
        reject(new Error(`Human review timed out after ${timeout}ms`));
      }, timeout);

      // 监听响应事件
      this.eventEmitter.once(`human_response:${requestKey}`, (response: HumanInLoopResponse) => {
        clearTimeout(timeoutId);
        resolve(response);
      });
    });
  }

  /**
   * 处理人工响应
   */
  private handleResponse(response: HumanInLoopResponse, step: WorkflowStep): any {
    console.log(`[HumanInLoop] Received response: ${response.action}`);

    switch (response.action) {
      case 'approve':
        return {
          approved: true,
          data: step.input,
          approvedAt: response.respondedAt,
        };

      case 'modify':
        return {
          approved: true,
          modified: true,
          data: response.modifiedData,
          approvedAt: response.respondedAt,
        };

      case 'reject':
        throw new Error(`Human rejected: ${response.reason || 'No reason provided'}`);

      case 'timeout':
        // 如果有降级策略，使用降级值
        if (step.fallback === 'auto_approve') {
          console.warn(`[HumanInLoop] Timeout, auto-approving...`);
          return {
            approved: true,
            autoApproved: true,
            data: step.input,
            reason: 'Timeout - auto approved',
          };
        }
        throw new Error('Human review timed out');

      default:
        throw new Error(`Unknown response action: ${String(response.action)}`);
    }
  }

  /**
   * 提交人工响应（由外部调用）
   */
  submitResponse(executionId: string, stepName: string, response: HumanInLoopResponse): void {
    const requestKey = `${executionId}:${stepName}`;

    if (!this.pendingRequests.has(requestKey)) {
      console.warn(`[HumanInLoop] No pending request for ${requestKey}`);
      return;
    }

    // 发出响应事件
    this.eventEmitter.emit(`human_response:${requestKey}`, response);
  }

  /**
   * 获取所有待处理请求
   */
  getPendingRequests(): HumanInLoopRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  /**
   * 获取事件发射器（供外部监听）
   */
  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }
}
