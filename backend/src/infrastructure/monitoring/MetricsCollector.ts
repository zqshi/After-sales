/**
 * MetricsCollector - Prometheus监控指标收集器
 *
 * 职责：
 * 1. 收集Agent调用指标（调用次数、响应时间、成功率）
 * 2. 收集工作流执行指标（执行次数、耗时、成功率）
 * 3. 收集任务状态指标（待办、进行中、完成）
 * 4. 收集对话指标（活跃、关闭、客户等级违规）
 * 5. 提供/metrics端点供Prometheus抓取
 */

import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
  Summary,
} from 'prom-client';

export class MetricsCollector {
  // ==================== Agent指标 ====================

  /**
   * Agent调用次数计数器
   * 标签: agent_name, status (success/error)
   */
  private agentCalls: Counter<string>;

  /**
   * Agent响应时间直方图
   * 标签: agent_name
   * 桶: 0.1s, 0.5s, 1s, 2s, 5s, 10s
   */
  private agentDuration: Histogram<string>;

  /**
   * Agent调用成功率摘要
   * 标签: agent_name
   */
  private agentSuccessRate: Summary<string>;

  /**
   * Agent置信度直方图
   * 标签: agent_name
   * 桶: 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0
   */
  private agentConfidence: Histogram<string>;

  // ==================== 工作流指标 ====================

  /**
   * 工作流执行次数计数器
   * 标签: workflow_name, status (completed/failed/timeout)
   */
  private workflowExecutions: Counter<string>;

  /**
   * 工作流执行时长直方图
   * 标签: workflow_name
   * 桶: 1s, 5s, 10s, 30s, 60s, 120s
   */
  private workflowDuration: Histogram<string>;

  /**
   * 工作流步骤执行计数器
   * 标签: workflow_name, step_name, status
   */
  private workflowSteps: Counter<string>;

  /**
   * 工作流中人工审核次数计数器
   * 标签: workflow_name, action (approve/reject/timeout)
   */
  private humanReviews: Counter<string>;

  // ==================== Task指标 ====================

  /**
   * Task状态分布仪表盘
   * 标签: status (pending/in_progress/completed/cancelled)
   */
  private tasksByStatus: Gauge<string>;

  /**
   * Task创建速率计数器
   * 标签: priority (urgent/high/medium/low)
   */
  private taskCreated: Counter<string>;

  /**
   * Task完成时长直方图
   * 标签: priority
   * 桶: 1h, 4h, 8h, 24h, 72h, 168h (1周)
   */
  private taskCompletionTime: Histogram<string>;

  /**
   * Task质量评分分布直方图
   * 标签: assignee
   * 桶: 0-10分，每1分一个桶
   */
  private taskQualityScore: Histogram<string>;

  // ==================== Conversation指标 ====================

  /**
   * Conversation状态分布仪表盘
   * 标签: status (open/closed)
   */
  private conversationsByStatus: Gauge<string>;

  /**
   * Conversation创建速率计数器
   * 标签: channel (feishu/wecom/web)
   */
  private conversationCreated: Counter<string>;

  /**
   * Conversation时长直方图（从创建到关闭）
   * 标签: channel
   * 桶: 5min, 15min, 30min, 1h, 4h, 24h
   */
  private conversationDuration: Histogram<string>;

  /**
   * 客户等级违规计数器
   * 标签: severity (warning/critical)
   */
  private slaViolations: Counter<string>;

  /**
   * 客户满意度评分分布直方图
   * 标签: channel
   * 桶: 1-5分
   */
  private customerSatisfaction: Histogram<string>;

  // ==================== Requirement指标 ====================

  /**
   * Requirement创建计数器
   * 标签: category (finance/technical/product/general), priority
   */
  private requirementCreated: Counter<string>;

  /**
   * Requirement状态分布仪表盘
   * 标签: status (open/in_progress/completed/rejected)
   */
  private requirementsByStatus: Gauge<string>;

  // ==================== 系统指标 ====================

  /**
   * HTTP请求计数器
   * 标签: method, route, status_code
   */
  private httpRequests: Counter<string>;

  /**
   * HTTP请求时长直方图
   * 标签: method, route
   */
  private httpDuration: Histogram<string>;

  /**
   * 数据库查询时长直方图
   * 标签: operation (select/insert/update/delete)
   */
  private dbQueryDuration: Histogram<string>;

  constructor() {
    // 初始化Agent指标
    this.agentCalls = new Counter({
      name: 'agent_calls_total',
      help: 'Total number of agent calls',
      labelNames: ['agent_name', 'status'],
    });

    this.agentDuration = new Histogram({
      name: 'agent_duration_seconds',
      help: 'Agent response duration in seconds',
      labelNames: ['agent_name'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    this.agentSuccessRate = new Summary({
      name: 'agent_success_rate',
      help: 'Agent call success rate',
      labelNames: ['agent_name'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
    });

    this.agentConfidence = new Histogram({
      name: 'agent_confidence',
      help: 'Agent confidence score distribution',
      labelNames: ['agent_name'],
      buckets: [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0],
    });

    // 初始化工作流指标
    this.workflowExecutions = new Counter({
      name: 'workflow_executions_total',
      help: 'Total workflow executions',
      labelNames: ['workflow_name', 'status'],
    });

    this.workflowDuration = new Histogram({
      name: 'workflow_duration_seconds',
      help: 'Workflow execution duration in seconds',
      labelNames: ['workflow_name'],
      buckets: [1, 5, 10, 30, 60, 120],
    });

    this.workflowSteps = new Counter({
      name: 'workflow_steps_total',
      help: 'Total workflow steps executed',
      labelNames: ['workflow_name', 'step_name', 'status'],
    });

    this.humanReviews = new Counter({
      name: 'workflow_human_reviews_total',
      help: 'Total human reviews in workflows',
      labelNames: ['workflow_name', 'action'],
    });

    // 初始化Task指标
    this.tasksByStatus = new Gauge({
      name: 'tasks_by_status',
      help: 'Number of tasks by status',
      labelNames: ['status'],
    });

    this.taskCreated = new Counter({
      name: 'tasks_created_total',
      help: 'Total tasks created',
      labelNames: ['priority'],
    });

    this.taskCompletionTime = new Histogram({
      name: 'task_completion_time_hours',
      help: 'Task completion time in hours',
      labelNames: ['priority'],
      buckets: [1, 4, 8, 24, 72, 168],
    });

    this.taskQualityScore = new Histogram({
      name: 'task_quality_score',
      help: 'Task quality score distribution',
      labelNames: ['assignee'],
      buckets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    });

    // 初始化Conversation指标
    this.conversationsByStatus = new Gauge({
      name: 'conversations_by_status',
      help: 'Number of conversations by status',
      labelNames: ['status'],
    });

    this.conversationCreated = new Counter({
      name: 'conversations_created_total',
      help: 'Total conversations created',
      labelNames: ['channel'],
    });

    this.conversationDuration = new Histogram({
      name: 'conversation_duration_minutes',
      help: 'Conversation duration in minutes',
      labelNames: ['channel'],
      buckets: [5, 15, 30, 60, 240, 1440],
    });

    this.slaViolations = new Counter({
      name: 'sla_violations_total',
      help: 'Total 客户等级 violations',
      labelNames: ['severity'],
    });

    this.customerSatisfaction = new Histogram({
      name: 'customer_satisfaction_score',
      help: 'Customer satisfaction score distribution',
      labelNames: ['channel'],
      buckets: [1, 2, 3, 4, 5],
    });

    // 初始化Requirement指标
    this.requirementCreated = new Counter({
      name: 'requirements_created_total',
      help: 'Total requirements created',
      labelNames: ['category', 'priority'],
    });

    this.requirementsByStatus = new Gauge({
      name: 'requirements_by_status',
      help: 'Number of requirements by status',
      labelNames: ['status'],
    });

    // 初始化系统指标
    this.httpRequests = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    });

    // 收集Node.js默认指标（CPU、内存、GC等）
    collectDefaultMetrics({ register });

    console.log('[MetricsCollector] Initialized with Prometheus metrics');
  }

  // ==================== Agent指标记录方法 ====================

  /**
   * 记录Agent调用
   */
  recordAgentCall(agentName: string, duration: number, status: 'success' | 'error'): void {
    this.agentCalls.inc({ agent_name: agentName, status });
    this.agentDuration.observe({ agent_name: agentName }, duration / 1000);

    // 记录成功率（1 = 成功，0 = 失败）
    const successValue = status === 'success' ? 1 : 0;
    this.agentSuccessRate.observe({ agent_name: agentName }, successValue);
  }

  /**
   * 记录Agent置信度
   */
  recordAgentConfidence(agentName: string, confidence: number): void {
    this.agentConfidence.observe({ agent_name: agentName }, confidence);
  }

  // ==================== 工作流指标记录方法 ====================

  /**
   * 记录工作流执行
   */
  recordWorkflowExecution(
    workflowName: string,
    duration: number,
    status: 'completed' | 'failed' | 'timeout',
  ): void {
    this.workflowExecutions.inc({ workflow_name: workflowName, status });
    this.workflowDuration.observe({ workflow_name: workflowName }, duration / 1000);
  }

  /**
   * 记录工作流步骤
   */
  recordWorkflowStep(
    workflowName: string,
    stepName: string,
    status: 'completed' | 'failed' | 'skipped',
  ): void {
    this.workflowSteps.inc({ workflow_name: workflowName, step_name: stepName, status });
  }

  /**
   * 记录人工审核
   */
  recordHumanReview(
    workflowName: string,
    action: 'approve' | 'reject' | 'modify' | 'timeout',
  ): void {
    this.humanReviews.inc({ workflow_name: workflowName, action });
  }

  // ==================== Task指标记录方法 ====================

  /**
   * 更新Task状态分布
   */
  setTasksByStatus(counts: Record<string, number>): void {
    for (const [status, count] of Object.entries(counts)) {
      this.tasksByStatus.set({ status }, count);
    }
  }

  /**
   * 记录Task创建
   */
  recordTaskCreated(priority: string): void {
    this.taskCreated.inc({ priority });
  }

  /**
   * 记录Task完成时长
   */
  recordTaskCompletion(priority: string, durationHours: number): void {
    this.taskCompletionTime.observe({ priority }, durationHours);
  }

  /**
   * 记录Task质量评分
   */
  recordTaskQuality(assignee: string, score: number): void {
    this.taskQualityScore.observe({ assignee }, score);
  }

  // ==================== Conversation指标记录方法 ====================

  /**
   * 更新Conversation状态分布
   */
  setConversationsByStatus(counts: Record<string, number>): void {
    for (const [status, count] of Object.entries(counts)) {
      this.conversationsByStatus.set({ status }, count);
    }
  }

  /**
   * 记录Conversation创建
   */
  recordConversationCreated(channel: string): void {
    this.conversationCreated.inc({ channel });
  }

  /**
   * 记录Conversation时长
   */
  recordConversationDuration(channel: string, durationMinutes: number): void {
    this.conversationDuration.observe({ channel }, durationMinutes);
  }

  /**
   * 记录客户等级违规
   */
  recordCustomerLevelViolation(severity: 'warning' | 'critical'): void {
    this.slaViolations.inc({ severity });
  }

  /**
   * 记录客户满意度
   */
  recordCustomerSatisfaction(channel: string, score: number): void {
    this.customerSatisfaction.observe({ channel }, score);
  }

  // ==================== Requirement指标记录方法 ====================

  /**
   * 记录Requirement创建
   */
  recordRequirementCreated(category: string, priority: string): void {
    this.requirementCreated.inc({ category, priority });
  }

  /**
   * 更新Requirement状态分布
   */
  setRequirementsByStatus(counts: Record<string, number>): void {
    for (const [status, count] of Object.entries(counts)) {
      this.requirementsByStatus.set({ status }, count);
    }
  }

  // ==================== 系统指标记录方法 ====================

  /**
   * 记录HTTP请求
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequests.inc({ method, route, status_code: String(statusCode) });
    this.httpDuration.observe({ method, route }, duration / 1000);
  }

  /**
   * 记录数据库查询
   */
  recordDbQuery(operation: 'select' | 'insert' | 'update' | 'delete', duration: number): void {
    this.dbQueryDuration.observe({ operation }, duration / 1000);
  }

  // ==================== 获取指标 ====================

  /**
   * 获取Prometheus格式的指标（供/metrics端点使用）
   */
  async getMetrics(): Promise<string> {
    return await register.metrics();
  }

  /**
   * 获取指标的Content-Type
   */
  getContentType(): string {
    return register.contentType;
  }

  /**
   * 清除所有指标（用于测试）
   */
  clear(): void {
    register.clear();
  }
}

// 导出单例
export const metricsCollector = new MetricsCollector();
