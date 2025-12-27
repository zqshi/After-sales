/**
 * 工作流引擎类型定义
 */

/**
 * 工作流步骤类型
 */
export type StepType =
  | 'action' // 普通动作
  | 'parallel' // 并行执行
  | 'human_in_loop' // 人工干预
  | 'condition'; // 条件分支

/**
 * 工作流步骤定义
 */
export interface WorkflowStep {
  name: string; // 步骤名称
  type?: StepType; // 步骤类型，默认为action
  agent?: string; // Agent名称（用于Agent调用）
  action?: string; // 动作名称（如classify、send_message等）
  input?: any; // 输入数据（支持变量引用，如$message.content）
  output?: string; // 输出变量名
  condition?: string; // 执行条件（如$confidence > 0.8）
  timeout?: number; // 超时时间（毫秒）
  fallback?: string; // 超时或失败时的降级策略
  steps?: WorkflowStep[]; // 子步骤（用于parallel或condition）
  loop?: string; // 循环变量（如$requirements）
  channel?: string; // 消息渠道（用于send_message）
  content?: string; // 消息内容
}

/**
 * 工作流触发器
 */
export interface WorkflowTrigger {
  type: 'im_message' | 'webhook' | 'schedule' | 'manual'; // 触发类型
  channel?: string; // 触发渠道（如feishu）
  event?: string; // 事件名称（如domain event）
  schedule?: string; // 定时表达式（cron）
}

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
  name: string; // 工作流名称
  description?: string; // 描述
  version?: string; // 版本
  trigger: WorkflowTrigger; // 触发器
  steps: WorkflowStep[]; // 步骤列表
  onError?: WorkflowStep[]; // 错误处理步骤
  onComplete?: WorkflowStep[]; // 完成后步骤
}

/**
 * 工作流上下文
 */
export interface WorkflowContext {
  workflowName: string; // 工作流名称
  executionId: string; // 执行ID
  trigger: {
    // 触发信息
    type: string;
    data: any;
  };
  variables: Record<string, any>; // 全局变量
  metadata?: Record<string, any>; // 元数据
}

/**
 * 工作流执行结果
 */
export interface WorkflowResult {
  executionId: string; // 执行ID
  workflowName: string; // 工作流名称
  status: 'completed' | 'failed' | 'timeout' | 'cancelled'; // 执行状态
  startedAt: Date; // 开始时间
  completedAt: Date; // 完成时间
  duration: number; // 执行时长（毫秒）
  steps: StepResult[]; // 步骤结果
  output: any; // 最终输出
  error?: {
    // 错误信息
    message: string;
    step: string;
    stack?: string;
  };
}

/**
 * 步骤执行结果
 */
export interface StepResult {
  stepName: string; // 步骤名称
  status: 'completed' | 'failed' | 'skipped' | 'timeout'; // 执行状态
  startedAt: Date; // 开始时间
  completedAt: Date; // 完成时间
  duration: number; // 执行时长（毫秒）
  input?: any; // 输入数据
  output?: any; // 输出数据
  error?: string; // 错误信息
}

/**
 * 步骤执行器接口
 */
export interface IStepExecutor {
  /**
   * 执行步骤
   */
  execute(step: WorkflowStep, context: WorkflowContext): Promise<any>;

  /**
   * 判断是否支持该步骤
   */
  supports(step: WorkflowStep): boolean;
}

/**
 * 工作流引擎配置
 */
export interface WorkflowEngineConfig {
  workflowsDir: string; // 工作流定义文件目录
  executorsDir?: string; // 自定义执行器目录
  defaultTimeout: number; // 默认超时时间（毫秒）
  maxParallelSteps: number; // 最大并行步骤数
  enableLogging: boolean; // 是否启用日志
  enableMetrics: boolean; // 是否启用指标收集
}

/**
 * 人工干预请求
 */
export interface HumanInLoopRequest {
  executionId: string; // 执行ID
  workflowName: string; // 工作流名称
  stepName: string; // 步骤名称
  requestedAt: Date; // 请求时间
  timeout: number; // 超时时间（毫秒）
  data: any; // 待审核数据
  options?: {
    // 审核选项
    approve?: boolean;
    reject?: boolean;
    modify?: boolean;
  };
}

/**
 * 人工干预响应
 */
export interface HumanInLoopResponse {
  executionId: string; // 执行ID
  stepName: string; // 步骤名称
  action: 'approve' | 'reject' | 'modify' | 'timeout'; // 操作
  modifiedData?: any; // 修改后的数据
  reason?: string; // 原因
  respondedAt: Date; // 响应时间
}
