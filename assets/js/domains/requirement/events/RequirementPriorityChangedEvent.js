/**
 * RequirementPriorityChangedEvent - 需求优先级变更领域事件
 *
 * 当需求优先级发生变更时触发
 *
 * 订阅者：
 * - 通知服务：通知相关人员优先级变化
 * - 任务服务：调整任务优先级
 * - 统计服务：更新优先级分布统计
 */

import { generateId } from '@/core/utils.js';

export class RequirementPriorityChangedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'RequirementPriorityChanged';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'Requirement';
    this.aggregateVersion = data.aggregateVersion || 1;

    // 事件数据
    this.requirementId = data.requirementId;
    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.oldPriority = data.oldPriority;
    this.newPriority = data.newPriority;
    this.reason = data.reason || '';
    this.changedBy = data.changedBy; // 变更人ID
    this.changedByName = data.changedByName || '';

    // 上下文
    this.title = data.title || '';
    this.category = data.category;
    this.status = data.status;
    this.assignedTo = data.assignedTo;

    this._validate();
  }

  _validate() {
    if (!this.requirementId) {
      throw new Error('RequirementPriorityChangedEvent: requirementId is required');
    }
    if (!this.oldPriority) {
      throw new Error('RequirementPriorityChangedEvent: oldPriority is required');
    }
    if (!this.newPriority) {
      throw new Error('RequirementPriorityChangedEvent: newPriority is required');
    }
  }

  /**
   * 是否升级
   */
  isEscalated() {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const oldIndex = priorities.indexOf(this.oldPriority);
    const newIndex = priorities.indexOf(this.newPriority);
    return newIndex > oldIndex;
  }

  /**
   * 是否降级
   */
  isDemoted() {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const oldIndex = priorities.indexOf(this.oldPriority);
    const newIndex = priorities.indexOf(this.newPriority);
    return newIndex < oldIndex;
  }

  /**
   * 是否变为紧急
   */
  isNowUrgent() {
    return this.newPriority === 'urgent';
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
      requirementId: this.requirementId,
      conversationId: this.conversationId,
      customerId: this.customerId,
      oldPriority: this.oldPriority,
      newPriority: this.newPriority,
      reason: this.reason,
      changedBy: this.changedBy,
      changedByName: this.changedByName,
      title: this.title,
      category: this.category,
      status: this.status,
      assignedTo: this.assignedTo,
    };
  }

  /**
   * 从JSON创建事件
   */
  static fromJSON(json) {
    return new RequirementPriorityChangedEvent(json);
  }
}
