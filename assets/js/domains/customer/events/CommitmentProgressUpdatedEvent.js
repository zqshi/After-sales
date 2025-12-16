/**
 * CommitmentProgressUpdatedEvent - 承诺进度更新事件
 *
 * 当客户承诺进度更新时触发
 */

import { generateId } from '../../../core/utils.js';

export class CommitmentProgressUpdatedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'CommitmentProgressUpdated';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'CustomerProfile';
    this.aggregateId = data.customerId;

    // 事件数据
    this.customerId = data.customerId;
    this.commitmentId = data.commitmentId;
    this.commitmentTitle = data.commitmentTitle || '';
    this.oldProgress = data.oldProgress;
    this.newProgress = data.newProgress;
    this.hasRisk = data.hasRisk || false;
    this.updatedBy = data.updatedBy || 'system';

    this._validate();
  }

  _validate() {
    if (!this.customerId) {
      throw new Error('CommitmentProgressUpdatedEvent: customerId is required');
    }
    if (!this.commitmentId) {
      throw new Error('CommitmentProgressUpdatedEvent: commitmentId is required');
    }
    if (this.newProgress === undefined || this.newProgress === null) {
      throw new Error('CommitmentProgressUpdatedEvent: newProgress is required');
    }
    if (this.newProgress < 0 || this.newProgress > 100) {
      throw new Error('CommitmentProgressUpdatedEvent: newProgress must be between 0 and 100');
    }
  }

  /**
   * 获取进度增量
   */
  getProgressDelta() {
    return this.newProgress - (this.oldProgress || 0);
  }

  /**
   * 是否进度倒退
   */
  isRegression() {
    return this.getProgressDelta() < 0;
  }

  /**
   * 是否即将完成（>80%）
   */
  isNearCompletion() {
    return this.newProgress >= 80;
  }

  /**
   * 是否进度延迟
   */
  isDelayed() {
    return this.hasRisk && this.newProgress < 50;
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
        commitmentId: this.commitmentId,
        commitmentTitle: this.commitmentTitle,
        oldProgress: this.oldProgress,
        newProgress: this.newProgress,
        hasRisk: this.hasRisk,
        updatedBy: this.updatedBy,
      },
    };
  }

  /**
   * 从JSON反序列化
   */
  static fromJSON(json) {
    return new CommitmentProgressUpdatedEvent({
      eventId: json.eventId,
      occurredAt: json.occurredAt,
      customerId: json.payload.customerId,
      commitmentId: json.payload.commitmentId,
      commitmentTitle: json.payload.commitmentTitle,
      oldProgress: json.payload.oldProgress,
      newProgress: json.payload.newProgress,
      hasRisk: json.payload.hasRisk,
      updatedBy: json.payload.updatedBy,
    });
  }
}
