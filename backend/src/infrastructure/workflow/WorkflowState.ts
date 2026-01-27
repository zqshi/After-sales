/**
 * WorkflowState - 工作流状态管理
 *
 * 职责：
 * 1. 管理工作流执行期间的变量和状态
 * 2. 支持变量引用和表达式计算（如$message.content）
 * 3. 记录步骤执行结果
 * 4. 提供条件评估能力
 */

import { WorkflowContext, StepResult, WorkflowResult } from './types';

export class WorkflowState {
  private context: WorkflowContext;
  private stepResults: Map<string, StepResult> = new Map();
  private startedAt: Date;
  private status: 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled' = 'running';
  private error?: { message: string; step: string; stack?: string };

  constructor(context: WorkflowContext) {
    this.context = context;
    this.startedAt = new Date();
  }

  /**
   * 设置变量
   */
  set(name: string, value: any): void {
    this.context.variables[name] = value;
  }

  /**
   * 获取变量（支持路径访问，如message.content）
   */
  get(path: string): any {
    if (!path) {
      return undefined;
    }

    // 如果以$开头，去掉$
    const cleanPath = path.startsWith('$') ? path.slice(1) : path;

    // 分割路径
    const parts = cleanPath.split('.');

    // 从变量中查找
    let value: any = this.context.variables;
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * 判断变量是否存在
   */
  has(name: string): boolean {
    return this.get(name) !== undefined;
  }

  /**
   * 获取所有变量
   */
  getVariables(): Record<string, any> {
    return { ...this.context.variables };
  }

  /**
   * 记录步骤结果
   */
  recordStepResult(result: StepResult): void {
    this.stepResults.set(result.stepName, result);
    // 如果步骤有输出，自动设置为变量
    if (result.output !== undefined) {
      this.set(result.stepName, result.output);
    }
  }

  /**
   * 获取步骤结果
   */
  getStepResult(stepName: string): StepResult | undefined {
    return this.stepResults.get(stepName);
  }

  /**
   * 获取所有步骤结果
   */
  getAllStepResults(): StepResult[] {
    return Array.from(this.stepResults.values());
  }

  /**
   * 评估条件表达式
   * 支持的表达式：
   * - $confidence > 0.8
   * - $message_type != 'urgent'
   * - $parallel_analysis.requirements.length > 0
   */
  evaluateCondition(condition: string): boolean {
    if (!condition || condition.trim() === '') {
      return true;
    }

    try {
      // 替换变量引用
      const resolvedCondition = this.resolveVariables(condition);

      // 使用Function构造函数评估表达式（安全的eval替代方案）
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + resolvedCondition)();

      return Boolean(result);
    } catch (err) {
      console.error('[WorkflowState] Failed to evaluate condition:', condition, err);
      return false;
    }
  }

  /**
   * 解析变量引用
   * 将$variable替换为实际值
   */
  private resolveVariables(expression: string): string {
    // 匹配$开头的变量引用（如$confidence, $message.content）
    const variablePattern = /\$([a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;

    return expression.replace(variablePattern, (match, varPath) => {
      const value = this.get(varPath);

      // 根据值类型转换为字符串
      if (value === undefined || value === null) {
        return 'undefined';
      }
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      // 对象或数组，返回JSON字符串
      return JSON.stringify(value);
    });
  }

  /**
   * 解析输入数据（支持变量引用）
   */
  resolveInput(input: any): any {
    if (input === null || input === undefined) {
      return input;
    }

    // 如果是字符串且以$开头，解析为变量
    if (typeof input === 'string' && input.startsWith('$')) {
      return this.get(input);
    }

    // 如果是对象，递归解析
    if (typeof input === 'object' && !Array.isArray(input)) {
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(input)) {
        resolved[key] = this.resolveInput(value);
      }
      return resolved;
    }

    // 如果是数组，递归解析
    if (Array.isArray(input)) {
      return input.map((item) => this.resolveInput(item));
    }

    // 其他类型直接返回
    return input;
  }

  /**
   * 设置工作流状态
   */
  setStatus(status: 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled'): void {
    this.status = status;
  }

  /**
   * 设置错误信息
   */
  setError(message: string, step: string, stack?: string): void {
    this.error = { message, step, stack };
    this.status = 'failed';
  }

  /**
   * 获取最终结果
   */
  getResult(): WorkflowResult {
    const completedAt = new Date();
    const duration = completedAt.getTime() - this.startedAt.getTime();

    return {
      executionId: this.context.executionId,
      workflowName: this.context.workflowName,
      status: this.status as 'completed' | 'failed' | 'timeout' | 'cancelled',
      startedAt: this.startedAt,
      completedAt,
      duration,
      steps: this.getAllStepResults(),
      output: this.getVariables(),
      error: this.error,
    };
  }

  /**
   * 获取上下文
   */
  getContext(): WorkflowContext {
    return this.context;
  }

  /**
   * 取消工作流
   */
  cancel(reason?: string): void {
    this.status = 'cancelled';
    if (reason) {
      this.error = { message: reason, step: 'cancelled' };
    }
  }
}
