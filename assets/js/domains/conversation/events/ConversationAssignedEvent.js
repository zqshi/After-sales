/**
 * ConversationAssignedEvent - 对话已分配领域事件
 *
 * 当对话被分配给客服时触发
 *
 * 订阅者：
 * - 通知服务：通知客服有新对话
 * - 统计服务：更新客服工作负载
 * - 任务服务：创建跟进任务
 */

import { generateId } from '@/core/utils.js';

export class ConversationAssignedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'ConversationAssigned';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'Conversation';
    this.aggregateVersion = data.aggregateVersion || 1;

    // 事件数据
    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.agentId = data.agentId;
    this.agentName = data.agentName;
    this.assignedBy = data.assignedBy; // 分配人ID（可能是系统自动分配）
    this.assignedByName = data.assignedByName || 'System';
    this.reason = data.reason || 'manual'; // 'manual' | 'auto' | 'reassign'

    // 上下文
    this.priority = data.priority; // 对话优先级
    this.channel = data.channel;

    this._validate();
  }

  _validate() {
    if (!this.conversationId) {
      throw new Error('ConversationAssignedEvent: conversationId is required');
    }
    if (!this.agentId) {
      throw new Error('ConversationAssignedEvent: agentId is required');
    }
    if (!this.agentName) {
      throw new Error('ConversationAssignedEvent: agentName is required');
    }
  }

  /**
   * 是否自动分配
   */
  isAutoAssigned() {
    return this.reason === 'auto';
  }

  /**
   * 是否重新分配
   */
  isReassignment() {
    return this.reason === 'reassign';
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
      conversationId: this.conversationId,
      customerId: this.customerId,
      agentId: this.agentId,
      agentName: this.agentName,
      assignedBy: this.assignedBy,
      assignedByName: this.assignedByName,
      reason: this.reason,
      priority: this.priority,
      channel: this.channel,
    };
  }

  /**
   * 从JSON创建事件
   */
  static fromJSON(json) {
    return new ConversationAssignedEvent(json);
  }
}
