/**
 * TaskCompletedEvent - 任务已完成领域事件
 *
 * 当任务被完成时触发
 *
 * 订阅者：
 * - 通知服务：通知相关人员任务完成
 * - 统计服务：更新任务完成率统计
 * - 质检服务：触发任务质量检查
 * - 需求服务：更新关联需求状态
 */

import { generateId } from '../../../core/utils.js';

export class TaskCompletedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'TaskCompleted';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'Task';
    this.aggregateVersion = data.aggregateVersion || 1;

    // 事件数据
    this.taskId = data.taskId;
    this.conversationId = data.conversationId;
    this.requirementId = data.requirementId;
    this.customerId = data.customerId;
    this.completedBy = data.completedBy;
    this.completedByName = data.completedByName || '';

    // 任务信息
    this.type = data.type;
    this.title = data.title || '';
    this.priority = data.priority;

    // 工时统计
    this.estimatedHours = data.estimatedHours;
    this.actualHours = data.actualHours;
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.duration = data.duration; // 实际耗时（小时）

    // 完成信息
    this.completionNotes = data.completionNotes || '';
    this.quality = data.quality; // 质量评分 1-5星

    // 按时完成标记
    this.dueDate = data.dueDate;
    this.isOverdue = data.isOverdue ?? false;

    this._validate();
  }

  _validate() {
    if (!this.taskId) {
      throw new Error('TaskCompletedEvent: taskId is required');
    }
    if (!this.completedBy) {
      throw new Error('TaskCompletedEvent: completedBy is required');
    }
  }

  /**
   * 是否逾期完成
   */
  isCompletedOverdue() {
    return this.isOverdue === true;
  }

  /**
   * 是否按时完成
   */
  isCompletedOnTime() {
    return !this.isOverdue;
  }

  /**
   * 是否超出预估工时
   */
  isOverEstimated() {
    if (!this.estimatedHours || !this.actualHours) {
      return false;
    }
    return this.actualHours > this.estimatedHours;
  }

  /**
   * 获取工时偏差百分比
   */
  getHoursDeviationPercentage() {
    if (!this.estimatedHours || !this.actualHours) {
      return 0;
    }
    const deviation = this.actualHours - this.estimatedHours;
    return Math.round((deviation / this.estimatedHours) * 100);
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      eventType: this.eventType,
      eventId: this.eventId,
      occurredAt: this.occurredAt,
      aggregateType: this.aggregateType,
      aggregateVersion: this.aggregateVersion,
      taskId: this.taskId,
      conversationId: this.conversationId,
      requirementId: this.requirementId,
      customerId: this.customerId,
      completedBy: this.completedBy,
      completedByName: this.completedByName,
      type: this.type,
      title: this.title,
      priority: this.priority,
      estimatedHours: this.estimatedHours,
      actualHours: this.actualHours,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      duration: this.duration,
      completionNotes: this.completionNotes,
      quality: this.quality,
      dueDate: this.dueDate,
      isOverdue: this.isOverdue,
    };
  }

  /**
   * 从JSON创建事件
   */
  static fromJSON(json) {
    return new TaskCompletedEvent(json);
  }
}
