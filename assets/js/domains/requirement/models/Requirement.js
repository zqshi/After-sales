import { generateId } from '../../../core/utils.js';

/**
 * Requirement聚合根
 *
 * 职责:
 * - 需求的完整生命周期管理
 * - 需求状态转换
 * - 优先级管理
 *
 * 不变量:
 * - requirementId必须唯一
 * - 已解决的需求不能修改内容
 * - 优先级变更需要记录
 */

import { RequirementStatusChangedEvent } from '../events/RequirementStatusChangedEvent.js';
import { RequirementPriorityChangedEvent } from '../events/RequirementPriorityChangedEvent.js';
import { RequirementCreatedEvent } from '../events/RequirementCreatedEvent.js';
import { RequirementSource } from './RequirementSource.js';
import { RequirementPriority } from './RequirementPriority.js';

/**
 * 需求状态
 */
export const RequirementStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  IGNORED: 'ignored',
  CANCELLED: 'cancelled',
};

/**
 * 需求类别
 */
export const RequirementCategory = {
  FEATURE: '功能需求',
  PERFORMANCE: '性能需求',
  BUG: '问题反馈',
  IMPROVEMENT: '优化建议',
};

/**
 * Requirement聚合根
 */
export class Requirement {
  constructor(data = {}) {
    // 聚合根标识
    this.id = data.id || generateId('req');

    // 基本信息
    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.customerName = data.customerName || '';

    // 需求内容
    this.category = data.category || RequirementCategory.FEATURE;
    this.title = data.title || '';
    this.description = data.description || data.content || '';
    this.content = data.content || this.description || this.title;
    this.status = data.status || RequirementStatus.PENDING;

    const priorityValue = new RequirementPriority(data.priority);
    this.priority = priorityValue.value;
    this.priorityDetail = priorityValue;
    const sourceValue = new RequirementSource(data.source);
    this.source = sourceValue.value;
    this.sourceDetail = sourceValue;

    // AI提取信息
    this.confidence = data.confidence || 1.0; // 0-1,AI提取的置信度
    this.sourceMessageIds = data.sourceMessageIds || []; // 来源消息ID

    // 处理信息
    this.assignedTo = data.assignedTo || null;
    this.assignedToName = data.assignedToName || '';
    this.estimatedEffort = data.estimatedEffort || null; // 预计工作量(小时)
    this.resolution = data.resolution || null; // 解决方案描述

    // 标签
    this.tags = data.tags || [];

    // 时间戳
    this.extractedAt = data.extractedAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.resolvedAt = data.resolvedAt || null;

    // 领域事件
    this._domainEvents = [];

    if (data.isNew) {
      this._addDomainEvent(new RequirementCreatedEvent({
        requirementId: this.id,
        conversationId: this.conversationId,
        customerId: this.customerId,
        content: this.content,
        source: this.source,
        priority: this.priority,
        confidence: this.confidence,
        assignedTo: this.assignedTo,
        createdAt: this.createdAt,
      }));
    }
  }

  // ============ 命令方法 ============

  /**
   * 开始处理需求
   */
  startProcessing(assignedTo, assignedToName) {
    if (this.status === RequirementStatus.RESOLVED) {
      throw new Error('Cannot process resolved requirement');
    }

    if (this.status === RequirementStatus.IGNORED) {
      throw new Error('Cannot process ignored requirement');
    }

    const oldStatus = this.status;
    this.status = RequirementStatus.IN_PROGRESS;
    this.assignedTo = assignedTo;
    this.assignedToName = assignedToName;
    this.updatedAt = new Date().toISOString();

    this._addDomainEvent(
      new RequirementStatusChangedEvent({
        requirementId: this.id,
        conversationId: this.conversationId,
        customerId: this.customerId,
        oldStatus,
        newStatus: this.status,
        assignedTo,
        assignedToName,
        category: this.category,
        priority: this.priority,
        title: this.title,
      }),
    );
  }

  /**
   * 解决需求
   */
  resolve(resolution, resolvedBy) {
    if (this.status === RequirementStatus.RESOLVED) {
      throw new Error('Requirement is already resolved');
    }

    const oldStatus = this.status;
    this.status = RequirementStatus.RESOLVED;
    this.resolution = resolution;
    this.resolvedAt = new Date().toISOString();
    this.updatedAt = this.resolvedAt;

    this._addDomainEvent(
      new RequirementStatusChangedEvent({
        requirementId: this.id,
        conversationId: this.conversationId,
        customerId: this.customerId,
        oldStatus,
        newStatus: this.status,
        resolution,
        resolvedBy,
        category: this.category,
        priority: this.priority,
        title: this.title,
      }),
    );
  }

  /**
   * 忽略需求
   */
  ignore(reason) {
    if (this.status === RequirementStatus.RESOLVED) {
      throw new Error('Cannot ignore resolved requirement');
    }

    const oldStatus = this.status;
    this.status = RequirementStatus.IGNORED;
    this.resolution = `已忽略: ${reason}`;
    this.updatedAt = new Date().toISOString();

    this._addDomainEvent(
      new RequirementStatusChangedEvent({
        requirementId: this.id,
        conversationId: this.conversationId,
        customerId: this.customerId,
        oldStatus,
        newStatus: this.status,
        reason,
        category: this.category,
        priority: this.priority,
        title: this.title,
      }),
    );
  }

  /**
   * 更新优先级
   */
  updatePriority(priority) {
    const normalized = new RequirementPriority(priority);
    const oldPriority = this.priority;
    this.priority = normalized.value;
    this.priorityDetail = normalized;
    this.updatedAt = new Date().toISOString();

    if (oldPriority !== this.priority) {
      this._addDomainEvent(
        new RequirementPriorityChangedEvent({
          requirementId: this.id,
          conversationId: this.conversationId,
          customerId: this.customerId,
          oldPriority,
          newPriority: this.priority,
          title: this.title,
          category: this.category,
          status: this.status,
          assignedTo: this.assignedTo,
        }),
      );
    }
  }

  /**
   * 设置预计工作量
   */
  setEstimatedEffort(hours) {
    if (hours < 0) {
      throw new Error('Estimated effort must be positive');
    }

    this.estimatedEffort = hours;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 添加标签
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date().toISOString();
    }
  }

  // ============ 查询方法 ============

  /**
   * 是否已解决
   */
  isResolved() {
    return this.status === RequirementStatus.RESOLVED;
  }

  /**
   * 是否已忽略
   */
  isIgnored() {
    return this.status === RequirementStatus.IGNORED;
  }

  /**
   * 是否正在处理
   */
  isInProgress() {
    return this.status === RequirementStatus.IN_PROGRESS;
  }

  /**
   * 是否高置信度(AI提取)
   */
  isHighConfidence() {
    return this.confidence >= 0.8;
  }

  /**
   * 是否紧急
   */
  isUrgent() {
    return this.priority === 'urgent';
  }

  // ============ 领域事件管理 ============

  _addDomainEvent(event) {
    this._domainEvents.push(event);
  }

  getDomainEvents() {
    return [...this._domainEvents];
  }

  clearDomainEvents() {
    this._domainEvents = [];
  }
}
