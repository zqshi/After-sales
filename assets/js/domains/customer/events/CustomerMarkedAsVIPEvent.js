/**
 * CustomerMarkedAsVIPEvent - 客户标记为VIP事件
 *
 * 当客户被标记为VIP或重点客户时触发
 */

import { generateId } from '../../../core/utils.js';

export class CustomerMarkedAsVIPEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'CustomerMarkedAsVIP';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'CustomerProfile';
    this.aggregateId = data.customerId;

    // 事件数据
    this.customerId = data.customerId;
    this.customerName = data.customerName || '';
    this.reason = data.reason;
    this.markedBy = data.markedBy || 'system';
    this.markedAt = data.markedAt || new Date().toISOString();
    this.vipLevel = data.vipLevel || '重点客户';  // 金牌客户 | 重点客户

    this._validate();
  }

  _validate() {
    if (!this.customerId) {
      throw new Error('CustomerMarkedAsVIPEvent: customerId is required');
    }
    if (!this.reason) {
      throw new Error('CustomerMarkedAsVIPEvent: reason is required');
    }
  }

  /**
   * 是否为金牌客户
   */
  isGoldVIP() {
    return this.vipLevel === '金牌客户';
  }

  /**
   * 是否为重点客户
   */
  isKeyCustomer() {
    return this.vipLevel === '重点客户';
  }

  /**
   * 是否自动标记
   */
  isAutoMarked() {
    return this.markedBy === 'system';
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
        customerName: this.customerName,
        reason: this.reason,
        markedBy: this.markedBy,
        markedAt: this.markedAt,
        vipLevel: this.vipLevel,
      },
    };
  }

  /**
   * 从JSON反序列化
   */
  static fromJSON(json) {
    return new CustomerMarkedAsVIPEvent({
      eventId: json.eventId,
      occurredAt: json.occurredAt,
      customerId: json.payload.customerId,
      customerName: json.payload.customerName,
      reason: json.payload.reason,
      markedBy: json.payload.markedBy,
      markedAt: json.payload.markedAt,
      vipLevel: json.payload.vipLevel,
    });
  }
}
