/**
 * RiskLevelChangedEvent - 风险等级变更事件
 *
 * 当客户风险等级发生变化时触发
 */

import { generateId } from '../../../core/utils.js';

export class RiskLevelChangedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'RiskLevelChanged';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'CustomerProfile';
    this.aggregateId = data.customerId;

    // 事件数据
    this.customerId = data.customerId;
    this.oldLevel = data.oldLevel;  // low | medium | high
    this.newLevel = data.newLevel;  // low | medium | high
    this.reason = data.reason || '';
    this.triggerType = data.triggerType || 'auto';  // auto | manual

    this._validate();
  }

  _validate() {
    if (!this.customerId) {
      throw new Error('RiskLevelChangedEvent: customerId is required');
    }
    if (!this.newLevel) {
      throw new Error('RiskLevelChangedEvent: newLevel is required');
    }
    const validLevels = ['low', 'medium', 'high'];
    if (!validLevels.includes(this.newLevel)) {
      throw new Error(`RiskLevelChangedEvent: invalid newLevel ${this.newLevel}`);
    }
  }

  /**
   * 是否升级风险
   */
  isEscalated() {
    const levelMap = { low: 1, medium: 2, high: 3 };
    return levelMap[this.newLevel] > levelMap[this.oldLevel];
  }

  /**
   * 是否降低风险
   */
  isDeescalated() {
    const levelMap = { low: 1, medium: 2, high: 3 };
    return levelMap[this.newLevel] < levelMap[this.oldLevel];
  }

  /**
   * 是否达到高风险
   */
  isCritical() {
    return this.newLevel === 'high';
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
        oldLevel: this.oldLevel,
        newLevel: this.newLevel,
        reason: this.reason,
        triggerType: this.triggerType,
      },
    };
  }

  /**
   * 从JSON反序列化
   */
  static fromJSON(json) {
    return new RiskLevelChangedEvent({
      eventId: json.eventId,
      occurredAt: json.occurredAt,
      customerId: json.payload.customerId,
      oldLevel: json.payload.oldLevel,
      newLevel: json.payload.newLevel,
      reason: json.payload.reason,
      triggerType: json.payload.triggerType,
    });
  }
}
