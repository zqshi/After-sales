/* eslint-disable import/no-unresolved, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
/**
 * MetricsScheduler - 定期更新指标的调度器
 *
 * 职责：
 * 1. 定期统计Task状态分布
 * 2. 定期统计Conversation状态分布
 * 3. 定期统计Requirement状态分布
 * 4. 更新Gauge类型的指标
 */

import { IConversationRepository } from '@domain/conversation/repositories/IConversationRepository';
import { IRequirementRepository } from '@domain/requirement/repositories/IRequirementRepository';
import { ITaskRepository } from '@domain/task/repositories/ITaskRepository';

import { metricsCollector } from './MetricsCollector';

export class MetricsScheduler {
  private taskRepository: ITaskRepository;
  private conversationRepository: IConversationRepository;
  private requirementRepository: IRequirementRepository;
  private intervals: NodeJS.Timeout[] = [];

  constructor(
    taskRepository: ITaskRepository,
    conversationRepository: IConversationRepository,
    requirementRepository: IRequirementRepository,
  ) {
    this.taskRepository = taskRepository;
    this.conversationRepository = conversationRepository;
    this.requirementRepository = requirementRepository;
  }

  /**
   * 启动调度器
   */
  start(): void {
    console.log('[MetricsScheduler] Starting metrics collection scheduler');

    // 每30秒更新一次Task状态统计
    const taskInterval = setInterval(() => {
      this.updateTaskMetrics();
    }, 30000);
    this.intervals.push(taskInterval);

    // 每30秒更新一次Conversation状态统计
    const conversationInterval = setInterval(() => {
      this.updateConversationMetrics();
    }, 30000);
    this.intervals.push(conversationInterval);

    // 每60秒更新一次Requirement状态统计
    const requirementInterval = setInterval(() => {
      this.updateRequirementMetrics();
    }, 60000);
    this.intervals.push(requirementInterval);

    // 立即执行一次
    this.updateTaskMetrics();
    this.updateConversationMetrics();
    this.updateRequirementMetrics();
  }

  /**
   * 停止调度器
   */
  stop(): void {
    console.log('[MetricsScheduler] Stopping metrics collection scheduler');
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
  }

  /**
   * 更新Task指标
   */
  private async updateTaskMetrics(): Promise<void> {
    try {
      const [pending, inProgress, completed, cancelled] = await Promise.all([
        this.taskRepository.countByFilters({ status: 'pending' }),
        this.taskRepository.countByFilters({ status: 'in_progress' }),
        this.taskRepository.countByFilters({ status: 'completed' }),
        this.taskRepository.countByFilters({ status: 'cancelled' }),
      ]);

      const statusCounts: Record<string, number> = {
        pending,
        in_progress: inProgress,
        completed,
        cancelled,
      };

      // 更新Gauge指标
      metricsCollector.setTasksByStatus(statusCounts);

      console.log('[MetricsScheduler] Updated task metrics:', statusCounts);
    } catch (err) {
      console.error('[MetricsScheduler] Failed to update task metrics:', err);
    }
  }

  /**
   * 更新Conversation指标
   */
  private async updateConversationMetrics(): Promise<void> {
    try {
      const [open, pending, closed] = await Promise.all([
        this.conversationRepository.countByFilters({ status: 'open' }),
        this.conversationRepository.countByFilters({ status: 'pending' }),
        this.conversationRepository.countByFilters({ status: 'closed' }),
      ]);

      const statusCounts: Record<string, number> = {
        open,
        pending,
        closed,
      };

      // 更新Gauge指标
      metricsCollector.setConversationsByStatus(statusCounts);

      console.log('[MetricsScheduler] Updated conversation metrics:', statusCounts);
    } catch (err) {
      console.error('[MetricsScheduler] Failed to update conversation metrics:', err);
    }
  }

  /**
   * 更新Requirement指标
   */
  private async updateRequirementMetrics(): Promise<void> {
    try {
      const [pending, approved, resolved, ignored, cancelled] = await Promise.all([
        this.requirementRepository.countByFilters({ status: 'pending' }),
        this.requirementRepository.countByFilters({ status: 'approved' }),
        this.requirementRepository.countByFilters({ status: 'resolved' }),
        this.requirementRepository.countByFilters({ status: 'ignored' }),
        this.requirementRepository.countByFilters({ status: 'cancelled' }),
      ]);

      const statusCounts: Record<string, number> = {
        pending,
        approved,
        resolved,
        ignored,
        cancelled,
      };

      // 更新Gauge指标
      metricsCollector.setRequirementsByStatus(statusCounts);

      console.log('[MetricsScheduler] Updated requirement metrics:', statusCounts);
    } catch (err) {
      console.error('[MetricsScheduler] Failed to update requirement metrics:', err);
    }
  }
}
