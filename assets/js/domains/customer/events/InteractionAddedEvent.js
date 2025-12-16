/**
 * InteractionAddedEvent - 互动记录添加事件
 *
 * 当添加新的客户互动记录时触发
 */

import { generateId } from '../../../core/utils.js';

export class InteractionAddedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'InteractionAdded';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'CustomerProfile';
    this.aggregateId = data.customerId;

    // 事件数据
    this.customerId = data.customerId;
    this.interactionType = data.interactionType;  // 对话 | 服务 | 投诉 | 咨询
    this.title = data.title || '';
    this.channel = data.channel || '';  // 电话 | 邮件 | 在线客服 | 微信
    this.result = data.result || '';  // 已解决 | 进行中 | 待跟进
    this.timestamp = data.timestamp || new Date().toISOString();
    this.relatedConversationId = data.relatedConversationId || null;

    this._validate();
  }

  _validate() {
    if (!this.customerId) {
      throw new Error('InteractionAddedEvent: customerId is required');
    }
    if (!this.interactionType) {
      throw new Error('InteractionAddedEvent: interactionType is required');
    }
  }

  /**
   * 是否为对话类型
   */
  isConversation() {
    return this.interactionType === '对话';
  }

  /**
   * 是否为投诉类型
   */
  isComplaint() {
    return this.interactionType === '投诉';
  }

  /**
   * 是否已解决
   */
  isResolved() {
    return this.result === '已解决';
  }

  /**
   * 是否需要跟进
   */
  needsFollowup() {
    return this.result === '待跟进' || this.result === '进行中';
  }

  /**
   * 序列化为JSON
   */
  toJSON() {
    return {
      eventType: this.eventType,
      eventId: this.eventId,
      occurredAt: this.occurredAt,
      aggregateType: this.aggregateType,
      aggregateId: this.aggregateId,
      payload: {
        customerId: this.customerId,
        interactionType: this.interactionType,
        title: this.title,
        channel: this.channel,
        result: this.result,
        timestamp: this.timestamp,
        relatedConversationId: this.relatedConversationId,
      },
    };
  }

  /**
   * 从JSON反序列化
   */
  static fromJSON(json) {
    return new InteractionAddedEvent({
      eventId: json.eventId,
      occurredAt: json.occurredAt,
      customerId: json.payload.customerId,
      interactionType: json.payload.interactionType,
      title: json.payload.title,
      channel: json.payload.channel,
      result: json.payload.result,
      timestamp: json.payload.timestamp,
      relatedConversationId: json.payload.relatedConversationId,
    });
  }
}
