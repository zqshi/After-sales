/**
 * ProfileRefreshedEvent - 客户画像刷新事件
 *
 * 当客户画像数据被刷新时触发
 */

import { generateId } from '../../../core/utils.js';

export class ProfileRefreshedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'ProfileRefreshed';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'CustomerProfile';
    this.aggregateId = data.customerId;

    // 事件数据
    this.customerId = data.customerId;
    this.conversationId = data.conversationId || null;
    this.updatedFields = data.updatedFields || [];
    this.refreshedAt = data.refreshedAt;
    this.source = data.source || 'manual';  // manual | crm | api

    this._validate();
  }

  _validate() {
    if (!this.customerId) {
      throw new Error('ProfileRefreshedEvent: customerId is required');
    }
    if (!this.refreshedAt) {
      throw new Error('ProfileRefreshedEvent: refreshedAt is required');
    }
  }

  /**
   * 获取刷新字段数量
   */
  getUpdatedFieldsCount() {
    return this.updatedFields.length;
  }

  /**
   * 检查特定字段是否更新
   */
  isFieldUpdated(fieldName) {
    return this.updatedFields.includes(fieldName);
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
        conversationId: this.conversationId,
        updatedFields: this.updatedFields,
        refreshedAt: this.refreshedAt,
        source: this.source,
      },
    };
  }

  /**
   * 从JSON反序列化
   */
  static fromJSON(json) {
    return new ProfileRefreshedEvent({
      eventId: json.eventId,
      occurredAt: json.occurredAt,
      customerId: json.payload.customerId,
      conversationId: json.payload.conversationId,
      updatedFields: json.payload.updatedFields,
      refreshedAt: json.payload.refreshedAt,
      source: json.payload.source,
    });
  }
}
