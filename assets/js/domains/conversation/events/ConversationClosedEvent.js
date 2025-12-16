/**
 * ConversationClosedEvent - 对话已关闭领域事件
 *
 * 当对话被关闭时触发
 *
 * 订阅者：
 * - 统计服务：更新对话统计数据
 * - 客户画像服务：更新客户满意度
 * - 质检服务：触发对话质检
 * - 任务服务：关闭相关任务
 */

import { generateId } from '../../../core/utils.js';

export class ConversationClosedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'ConversationClosed';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'Conversation';
    this.aggregateVersion = data.aggregateVersion || 1;

    // 事件数据
    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.closedBy = data.closedBy; // 关闭人ID
    this.closedByName = data.closedByName || '';
    this.resolution = data.resolution; // 'resolved' | 'cancelled' | 'transferred'
    this.resolutionNotes = data.resolutionNotes || '';

    // 对话统计
    this.duration = data.duration; // 持续时间（秒）
    this.messageCount = data.messageCount;
    this.firstResponseTime = data.firstResponseTime; // 首次响应时间（秒）
    this.averageResponseTime = data.averageResponseTime; // 平均响应时间（秒）

    // SLA信息
    this.slaStatus = data.slaStatus; // '达标' | '违规'
    this.slaViolated = data.slaViolated ?? false;

    // 上下文
    this.agentId = data.agentId;
    this.channel = data.channel;

    this._validate();
  }

  _validate() {
    if (!this.conversationId) {
      throw new Error('ConversationClosedEvent: conversationId is required');
    }
    if (!this.customerId) {
      throw new Error('ConversationClosedEvent: customerId is required');
    }
    if (!this.closedBy) {
      throw new Error('ConversationClosedEvent: closedBy is required');
    }
    if (!this.resolution) {
      throw new Error('ConversationClosedEvent: resolution is required');
    }
  }

  /**
   * 是否成功解决
   */
  isResolved() {
    return this.resolution === 'resolved';
  }

  /**
   * 是否SLA违规
   */
  isSLAViolated() {
    return this.slaViolated === true;
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
      closedBy: this.closedBy,
      closedByName: this.closedByName,
      resolution: this.resolution,
      resolutionNotes: this.resolutionNotes,
      duration: this.duration,
      messageCount: this.messageCount,
      firstResponseTime: this.firstResponseTime,
      averageResponseTime: this.averageResponseTime,
      slaStatus: this.slaStatus,
      slaViolated: this.slaViolated,
      agentId: this.agentId,
      channel: this.channel,
    };
  }

  /**
   * 从JSON创建事件
   */
  static fromJSON(json) {
    return new ConversationClosedEvent(json);
  }
}
