/**
 * RequirementStatusChangedEvent - 需求状态变更领域事件
 *
 * 当需求状态发生变更时触发
 *
 * 订阅者：
 * - 通知服务：通知相关人员
 * - 任务服务：根据状态创建/更新任务
 * - 统计服务：更新需求统计
 * - 客户画像服务：更新需求反馈记录
 */

import { generateId } from '../../../core/utils.js';

export class RequirementStatusChangedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'RequirementStatusChanged';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'Requirement';
    this.aggregateVersion = data.aggregateVersion || 1;

    // 事件数据
    this.requirementId = data.requirementId;
    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.oldStatus = data.oldStatus;
    this.newStatus = data.newStatus;
    this.reason = data.reason || '';

    // 状态变更详情
    this.assignedTo = data.assignedTo;
    this.assignedToName = data.assignedToName || '';
    this.resolution = data.resolution; // 解决方案（当状态变为resolved时）
    this.resolvedBy = data.resolvedBy; // 解决人
    this.resolvedByName = data.resolvedByName || '';

    // 上下文
    this.category = data.category; // 需求类别
    this.priority = data.priority;
    this.title = data.title || '';

    this._validate();
  }

  _validate() {
    if (!this.requirementId) {
      throw new Error('RequirementStatusChangedEvent: requirementId is required');
    }
    if (!this.oldStatus) {
      throw new Error('RequirementStatusChangedEvent: oldStatus is required');
    }
    if (!this.newStatus) {
      throw new Error('RequirementStatusChangedEvent: newStatus is required');
    }
  }

  /**
   * 是否开始处理
   */
  isStarted() {
    return this.oldStatus === 'pending' && this.newStatus === 'in_progress';
  }

  /**
   * 是否已解决
   */
  isResolved() {
    return this.newStatus === 'resolved';
  }

  /**
   * 是否已忽略
   */
  isIgnored() {
    return this.newStatus === 'ignored';
  }

  /**
   * 是否已取消
   */
  isCancelled() {
    return this.newStatus === 'cancelled';
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
      oldStatus: this.oldStatus,
      newStatus: this.newStatus,
      reason: this.reason,
      assignedTo: this.assignedTo,
      assignedToName: this.assignedToName,
      resolution: this.resolution,
      resolvedBy: this.resolvedBy,
      resolvedByName: this.resolvedByName,
      category: this.category,
      priority: this.priority,
      title: this.title,
    };
  }

  /**
   * 从JSON创建事件
   */
  static fromJSON(json) {
    return new RequirementStatusChangedEvent(json);
  }
}
