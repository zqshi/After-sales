/**
 * TaskCancelledEvent - 任务已取消领域事件
 *
 * 当任务被取消时触发
 *
 * 订阅者：
 * - 通知服务：通知相关人员
 * - 统计服务：更新任务取消统计
 * - 需求服务：检查是否需要调整需求状态
 */

import { generateId } from '../../../core/utils.js';

export class TaskCancelledEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'TaskCancelled';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'Task';
    this.aggregateVersion = data.aggregateVersion || 1;

    // 事件数据
    this.taskId = data.taskId;
    this.conversationId = data.conversationId;
    this.requirementId = data.requirementId;
    this.customerId = data.customerId;
    this.oldStatus = data.oldStatus;
    this.reason = data.reason;
    this.cancelledBy = data.cancelledBy;
    this.cancelledByName = data.cancelledByName || '';

    // 任务信息
    this.type = data.type;
    this.title = data.title || '';
    this.priority = data.priority;
    this.assignedTo = data.assignedTo;
    this.assignedToName = data.assignedToName || '';

    // 工时信息
    this.startedAt = data.startedAt;
    this.elapsedHours = data.elapsedHours; // 已耗费工时

    this._validate();
  }

  _validate() {
    if (!this.taskId) {
      throw new Error('TaskCancelledEvent: taskId is required');
    }
    if (!this.reason) {
      throw new Error('TaskCancelledEvent: reason is required');
    }
    if (!this.cancelledBy) {
      throw new Error('TaskCancelledEvent: cancelledBy is required');
    }
  }

  /**
   * 是否已开始工作
   */
  wasStarted() {
    return !!this.startedAt;
  }

  /**
   * 是否有工时损失
   */
  hasHoursLoss() {
    return this.elapsedHours > 0;
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
      oldStatus: this.oldStatus,
      reason: this.reason,
      cancelledBy: this.cancelledBy,
      cancelledByName: this.cancelledByName,
      type: this.type,
      title: this.title,
      priority: this.priority,
      assignedTo: this.assignedTo,
      assignedToName: this.assignedToName,
      startedAt: this.startedAt,
      elapsedHours: this.elapsedHours,
    };
  }

  /**
   * 从JSON创建事件
   */
  static fromJSON(json) {
    return new TaskCancelledEvent(json);
  }
}
