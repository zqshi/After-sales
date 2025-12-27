/**
 * BaseStepExecutor - 步骤执行器基类
 */

import { IStepExecutor, WorkflowStep, WorkflowContext } from '../types';

export abstract class BaseStepExecutor implements IStepExecutor {
  /**
   * 执行步骤
   */
  abstract execute(step: WorkflowStep, context: WorkflowContext): Promise<any>;

  /**
   * 判断是否支持该步骤
   */
  abstract supports(step: WorkflowStep): boolean;

  /**
   * 执行前钩子
   */
  protected async beforeExecute(step: WorkflowStep, context: WorkflowContext): Promise<void> {
    console.log(`[Executor] Executing step: ${step.name}`);
  }

  /**
   * 执行后钩子
   */
  protected async afterExecute(
    step: WorkflowStep,
    context: WorkflowContext,
    result: any,
  ): Promise<void> {
    console.log(`[Executor] Step ${step.name} completed`);
  }

  /**
   * 错误处理
   */
  protected async onError(
    step: WorkflowStep,
    context: WorkflowContext,
    error: Error,
  ): Promise<void> {
    console.error(`[Executor] Step ${step.name} failed:`, error.message);
  }

  /**
   * 超时处理
   */
  protected async onTimeout(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    console.warn(`[Executor] Step ${step.name} timed out`);

    // 如果有降级策略，返回降级值
    if (step.fallback) {
      return step.fallback;
    }

    throw new Error(`Step ${step.name} timed out after ${step.timeout}ms`);
  }
}
