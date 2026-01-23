/**
 * CustomerLevelViolatedEvent - 客户等级违规领域事件
 *
 * 当对话违反客户等级时触发
 *
 * 订阅者：
 * - 通知服务：发送告警通知
 * - 任务服务：创建客户等级违规任务
 * - 统计服务：更新客户等级统计
 * - 质检服务：标记需要质检
 */

import { generateId } from '../../../core/utils.js';

export class CustomerLevelViolatedEvent {
  constructor(data) {
    // 事件元数据
    this.eventType = 'CustomerLevelViolated';
    this.eventId = data.eventId || generateId();
    this.occurredAt = data.occurredAt || new Date().toISOString();
    this.aggregateType = 'Conversation';
    this.aggregateVersion = data.aggregateVersion || 1;

    // 事件数据
    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.violationType = data.violationType; // 'firstResponse' | 'resolution' | 'responseTime'
    this.violationDescription = data.violationDescription || '';

    // 客户等级指标
    this.expectedTime = data.expectedTime; // 期望时间（分钟）
    this.actualTime = data.actualTime; // 实际时间（分钟）
    this.delayTime = data.delayTime || (data.actualTime - data.expectedTime); // 超时时间
    this.slaLevel = data.slaLevel; // '金牌' | '银牌' | '铜牌'

    // 严重程度
    this.severity = data.severity; // 'minor' | 'major' | 'critical'

    // 上下文
    this.agentId = data.agentId;
    this.agentName = data.agentName || '';
    this.channel = data.channel;

    this._validate();
  }

  _validate() {
    if (!this.conversationId) {
      throw new Error('CustomerLevelViolatedEvent: conversationId is required');
    }
    if (!this.customerId) {
      throw new Error('CustomerLevelViolatedEvent: customerId is required');
    }
    if (!this.violationType) {
      throw new Error('CustomerLevelViolatedEvent: violationType is required');
    }
    if (this.expectedTime === undefined || this.expectedTime === null) {
      throw new Error('CustomerLevelViolatedEvent: expectedTime is required');
    }
    if (this.actualTime === undefined || this.actualTime === null) {
      throw new Error('CustomerLevelViolatedEvent: actualTime is required');
    }
    if (!this.severity) {
      throw new Error('CustomerLevelViolatedEvent: severity is required');
    }
  }

  /**
   * 是否首次响应超时
   */
  isFirstResponseViolation() {
    return this.violationType === 'firstResponse';
  }

  /**
   * 是否解决时间超时
   */
  isResolutionViolation() {
    return this.violationType === 'resolution';
  }

  /**
   * 是否严重违规
   */
  isCritical() {
    return this.severity === 'critical';
  }

  /**
   * 获取超时百分比
   */
  getDelayPercentage() {
    if (this.expectedTime === 0) {
      return 0;
    }
    return Math.round((this.delayTime / this.expectedTime) * 100);
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
      violationType: this.violationType,
      violationDescription: this.violationDescription,
      expectedTime: this.expectedTime,
      actualTime: this.actualTime,
      delayTime: this.delayTime,
      slaLevel: this.slaLevel,
      severity: this.severity,
      agentId: this.agentId,
      agentName: this.agentName,
      channel: this.channel,
    };
  }

  /**
   * 从JSON创建事件
   */
  static fromJSON(json) {
    return new CustomerLevelViolatedEvent(json);
  }
}
