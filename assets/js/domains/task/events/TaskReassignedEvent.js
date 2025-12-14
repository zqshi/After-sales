/**
 * TaskReassignedEvent - 任务已重新分配领域事件
 *
 * 当任务被重新分配给其他人时触发
 *
 * 订阅者：
 * - 通知服务：通知新负责人和原负责人
 * - 统计服务：更新负载统计
 */

import { generateId } from '@/core/utils.js';

export class TaskReassignedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'TaskReassigned';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'Task';
    this.aggregateVersion = data.aggregateVersion || 1;

    // 事件数据
    this.taskId = data.taskId;
    this.conversationId = data.conversationId;
    this.requirementId = data.requirementId;
    this.customerId = data.customerId;

    // 重新分配信息
    this.oldAssignedTo = data.oldAssignedTo;
    this.oldAssignedToName = data.oldAssignedToName || '';
    this.newAssignedTo = data.newAssignedTo;
    this.newAssignedToName = data.newAssignedToName || '';
    this.reason = data.reason;
    this.reassignedBy = data.reassignedBy;
    this.reassignedByName = data.reassignedByName || '';

    // 任务信息
    this.type = data.type;
    this.title = data.title || '';
    this.priority = data.priority;
    this.status = data.status;
    this.dueDate = data.dueDate;

    this._validate();
  }

  _validate() {
    if (!this.taskId) {
      throw new Error('TaskReassignedEvent: taskId is required');
    }
    if (!this.oldAssignedTo) {
      throw new Error('TaskReassignedEvent: oldAssignedTo is required');
    }
    if (!this.newAssignedTo) {
      throw new Error('TaskReassignedEvent: newAssignedTo is required');
    }
    if (!this.reason) {
      throw new Error('TaskReassignedEvent: reason is required');
    }
  }

  /**
   * 是否自我分配
   */
  isSelfReassignment() {
    return this.reassignedBy === this.newAssignedTo;
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
      oldAssignedTo: this.oldAssignedTo,
      oldAssignedToName: this.oldAssignedToName,
      newAssignedTo: this.newAssignedTo,
      newAssignedToName: this.newAssignedToName,
      reason: this.reason,
      reassignedBy: this.reassignedBy,
      reassignedByName: this.reassignedByName,
      type: this.type,
      title: this.title,
      priority: this.priority,
      status: this.status,
      dueDate: this.dueDate,
    };
  }

  /**
   * 从JSON创建事件
   */
  static fromJSON(json) {
    return new TaskReassignedEvent(json);
  }
}
