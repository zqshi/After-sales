/**
 * MessageSentEvent - 消息已发送领域事件
 *
 * 当对话中发送新消息时触发
 *
 * 订阅者：
 * - AI分析服务：进行情感分析和意图识别
 * - 通知服务：发送消息通知
 * - 需求采集服务：检测是否包含需求
 * - 客户画像服务：更新互动记录
 */

import { generateId } from '@/core/utils.js';

export class MessageSentEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'MessageSent';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'Conversation';
    this.aggregateVersion = data.aggregateVersion || 1;

    // 事件数据
    this.conversationId = data.conversationId;
    this.messageId = data.messageId;
    this.senderId = data.senderId;
    this.senderType = data.senderType; // 'customer' | 'agent' | 'system'
    this.senderName = data.senderName || '';
    this.content = data.content;
    this.messageType = data.messageType || 'text';
    this.channel = data.channel; // 'chat' | 'email' | 'feishu' | 'wechat'

    // 上下文信息
    this.customerId = data.customerId;
    this.agentId = data.agentId;

    this._validate();
  }

  _validate() {
    if (!this.conversationId) {
      throw new Error('MessageSentEvent: conversationId is required');
    }
    if (!this.messageId) {
      throw new Error('MessageSentEvent: messageId is required');
    }
    if (!this.senderId) {
      throw new Error('MessageSentEvent: senderId is required');
    }
    if (!this.senderType) {
      throw new Error('MessageSentEvent: senderType is required');
    }
    if (!this.content) {
      throw new Error('MessageSentEvent: content is required');
    }
  }

  /**
   * 是否来自客户
   */
  isFromCustomer() {
    return this.senderType === 'customer';
  }

  /**
   * 是否来自客服
   */
  isFromAgent() {
    return this.senderType === 'agent';
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
      messageId: this.messageId,
      senderId: this.senderId,
      senderType: this.senderType,
      senderName: this.senderName,
      content: this.content,
      messageType: this.messageType,
      channel: this.channel,
      customerId: this.customerId,
      agentId: this.agentId,
    };
  }

  /**
   * 从JSON创建事件
   */
  static fromJSON(json) {
    return new MessageSentEvent(json);
  }
}
