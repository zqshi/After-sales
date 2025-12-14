/**
 * TaskStartedEvent - 任务已开始领域事件
 *
 * 当任务被开始时触发
 *
 * 订阅者：
 * - 通知服务：通知任务负责人
 * - 统计服务：更新任务进度统计
 * - 时间追踪服务：开始计时
 */

import { generateId } from '@/core/utils.js';

export class TaskStartedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'TaskStarted';
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
    this.assignedTo = data.assignedTo;
    this.assignedToName = data.assignedToName || '';

    // 任务信息
    this.type = data.type; // 任务类型
    this.title = data.title || '';
    this.priority = data.priority;
    this.dueDate = data.dueDate;
    this.estimatedHours = data.estimatedHours;

    this._validate();
  }

  _validate() {
    if (!this.taskId) {
      throw new Error('TaskStartedEvent: taskId is required');
    }
    if (!this.assignedTo) {
      throw new Error('TaskStartedEvent: assignedTo is required');
    }
  }

  /**
   * 是否有截止日期
   */
  hasDueDate() {
    return !!this.dueDate;
  }

  /**
   * 是否紧急任务
   */
  isUrgent() {
    return this.priority === 'urgent';
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
      assignedTo: this.assignedTo,
      assignedToName: this.assignedToName,
      type: this.type,
      title: this.title,
      priority: this.priority,
      dueDate: this.dueDate,
      estimatedHours: this.estimatedHours,
    };
  }

  /**
   * 从JSON创建事件
   */
  static fromJSON(json) {
    return new TaskStartedEvent(json);
  }
}
