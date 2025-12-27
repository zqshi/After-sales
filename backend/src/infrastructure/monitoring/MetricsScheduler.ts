/**
 * MetricsScheduler - 定期更新指标的调度器
 *
 * 职责：
 * 1. 定期统计Task状态分布
 * 2. 定期统计Conversation状态分布
 * 3. 定期统计Requirement状态分布
 * 4. 更新Gauge类型的指标
 */

import { metricsCollector } from './MetricsCollector';
import { TaskRepository } from '../../domain/task/repositories/TaskRepository';
import { ConversationRepository } from '../../domain/conversation/repositories/ConversationRepository';
import { RequirementRepository } from '../../domain/requirement/repositories/RequirementRepository';

export class MetricsScheduler {
  private taskRepository: TaskRepository;
  private conversationRepository: ConversationRepository;
  private requirementRepository: RequirementRepository;
  private intervals: NodeJS.Timeout[] = [];

  constructor(
    taskRepository: TaskRepository,
    conversationRepository: ConversationRepository,
    requirementRepository: RequirementRepository,
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
      // 统计各状态的Task数量
      const statusCounts: Record<string, number> = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      };

      // 获取所有Task（这里简化处理，实际应该用聚合查询）
      const allTasks = await this.taskRepository.findAll();

      for (const task of allTasks) {
        const status = task.status;
        if (status in statusCounts) {
          statusCounts[status]++;
        }
      }

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
      // 统计各状态的Conversation数量
      const statusCounts: Record<string, number> = {
        open: 0,
        closed: 0,
      };

      // 获取所有Conversation
      const allConversations = await this.conversationRepository.findAll();

      for (const conversation of allConversations) {
        const status = conversation.status;
        if (status in statusCounts) {
          statusCounts[status]++;
        }
      }

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
      // 统计各状态的Requirement数量
      const statusCounts: Record<string, number> = {
        open: 0,
        in_progress: 0,
        completed: 0,
        rejected: 0,
      };

      // 获取所有Requirement
      const allRequirements = await this.requirementRepository.findAll();

      for (const requirement of allRequirements) {
        const status = requirement.status;
        if (status in statusCounts) {
          statusCounts[status]++;
        }
      }

      // 更新Gauge指标
      metricsCollector.setRequirementsByStatus(statusCounts);

      console.log('[MetricsScheduler] Updated requirement metrics:', statusCounts);
    } catch (err) {
      console.error('[MetricsScheduler] Failed to update requirement metrics:', err);
    }
  }
}
