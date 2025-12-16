/**
 * ServiceRecordAddedEvent - 服务记录添加事件
 *
 * 当新增服务记录时触发
 */

import { generateId } from '../../../core/utils.js';

export class ServiceRecordAddedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'ServiceRecordAdded';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'CustomerProfile';
    this.aggregateId = data.customerId;

    // 事件数据
    this.customerId = data.customerId;
    this.serviceRecordId = data.serviceRecordId;
    this.title = data.title;
    this.status = data.status;  // 进行中 | 已完成
    this.owner = data.owner || '';
    this.relatedConversationIds = data.relatedConversationIds || [];

    this._validate();
  }

  _validate() {
    if (!this.customerId) {
      throw new Error('ServiceRecordAddedEvent: customerId is required');
    }
    if (!this.serviceRecordId) {
      throw new Error('ServiceRecordAddedEvent: serviceRecordId is required');
    }
    if (!this.title) {
      throw new Error('ServiceRecordAddedEvent: title is required');
    }
  }

  /**
   * 是否完成
   */
  isCompleted() {
    return this.status === '已完成';
  }

  /**
   * 获取关联对话数量
   */
  getRelatedConversationCount() {
    return this.relatedConversationIds.length;
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
        serviceRecordId: this.serviceRecordId,
        title: this.title,
        status: this.status,
        owner: this.owner,
        relatedConversationIds: this.relatedConversationIds,
      },
    };
  }

  /**
   * 从JSON反序列化
   */
  static fromJSON(json) {
    return new ServiceRecordAddedEvent({
      eventId: json.eventId,
      occurredAt: json.occurredAt,
      customerId: json.payload.customerId,
      serviceRecordId: json.payload.serviceRecordId,
      title: json.payload.title,
      status: json.payload.status,
      owner: json.payload.owner,
      relatedConversationIds: json.payload.relatedConversationIds,
    });
  }
}
