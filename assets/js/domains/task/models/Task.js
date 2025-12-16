import { generateId } from '../../../core/utils.js';

/**
 * Task聚合根
 *
 * 职责:
 * - 任务的完整生命周期管理
 * - 任务状态转换
 * - 工时跟踪
 *
 * 不变量:
 * - taskId必须唯一
 * - 已完成的任务不能修改
 * - 实际工时不能为负数
 */

import { TaskStartedEvent } from '../events/TaskStartedEvent.js';
import { TaskCompletedEvent } from '../events/TaskCompletedEvent.js';
import { TaskCancelledEvent } from '../events/TaskCancelledEvent.js';
import { TaskReassignedEvent } from '../events/TaskReassignedEvent.js';

/**
 * 任务状态
 */
export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/**
 * 任务类型
 */
export const TaskType = {
  FOLLOW_UP: 'follow_up', // 跟进任务
  REQUIREMENT: 'requirement', // 需求任务
  QUALITY_ISSUE: 'quality_issue', // 质量问题
  SLA_VIOLATION: 'sla_violation', // SLA违规
};

/**
 * Task聚合根
 */
export class Task {
  constructor(data = {}) {
    // 聚合根标识
    this.id = data.id || generateId('task');

    // 关联信息
    this.conversationId = data.conversationId || null;
    this.requirementId = data.requirementId || null;
    this.customerId = data.customerId || null;

    // 任务信息
    this.type = data.type || TaskType.FOLLOW_UP;
    this.title = data.title || '';
    this.description = data.description || '';
    this.priority = data.priority || 'medium'; // 'low' | 'medium' | 'high' | 'urgent'
    this.status = data.status || TaskStatus.TODO;

    // 分配信息
    this.assignedTo = data.assignedTo || null;
    this.assignedToName = data.assignedToName || '';
    this.assignedBy = data.assignedBy || null;

    // 时间信息
    this.dueDate = data.dueDate || null; // ISO 8601
    this.estimatedHours = data.estimatedHours || null;
    this.actualHours = data.actualHours || null;

    // 进度
    this.progress = data.progress || 0; // 0-100

    // 标签
    this.tags = data.tags || [];

    // 完成信息
    this.completionNotes = data.completionNotes || '';
    this.quality = data.quality || null; // 1-5星评分

    // 时间戳
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.startedAt = data.startedAt || null;
    this.completedAt = data.completedAt || null;

    // 领域事件
    this._domainEvents = [];
  }

  // ============ 命令方法 ============

  /**
   * 开始任务
   */
  start() {
    if (this.status === TaskStatus.COMPLETED) {
      throw new Error('Cannot start completed task');
    }

    if (this.status === TaskStatus.CANCELLED) {
      throw new Error('Cannot start cancelled task');
    }

    const oldStatus = this.status;
    this.status = TaskStatus.IN_PROGRESS;
    this.startedAt = new Date().toISOString();
    this.updatedAt = this.startedAt;

    this._addDomainEvent(
      new TaskStartedEvent({
        taskId: this.id,
        conversationId: this.conversationId,
        requirementId: this.requirementId,
        customerId: this.customerId,
        oldStatus,
        assignedTo: this.assignedTo,
        assignedToName: this.assignedToName,
        type: this.type,
        title: this.title,
        priority: this.priority,
        dueDate: this.dueDate,
        estimatedHours: this.estimatedHours,
      }),
    );
  }

  /**
   * 完成任务
   */
  complete(completedBy, options = {}) {
    if (this.status === TaskStatus.COMPLETED) {
      throw new Error('Task is already completed');
    }

    if (this.status === TaskStatus.CANCELLED) {
      throw new Error('Cannot complete cancelled task');
    }

    this.status = TaskStatus.COMPLETED;
    this.completedAt = new Date().toISOString();
    this.updatedAt = this.completedAt;
    this.progress = 100;

    if (options.actualHours !== undefined) {
      this.actualHours = options.actualHours;
    }

    if (options.completionNotes) {
      this.completionNotes = options.completionNotes;
    }

    if (options.quality) {
      this.quality = options.quality;
    }

    this._addDomainEvent(
      new TaskCompletedEvent({
        taskId: this.id,
        conversationId: this.conversationId,
        requirementId: this.requirementId,
        customerId: this.customerId,
        completedBy,
        type: this.type,
        title: this.title,
        priority: this.priority,
        estimatedHours: this.estimatedHours,
        actualHours: this.actualHours,
        startedAt: this.startedAt,
        completedAt: this.completedAt,
        duration: this.getElapsedHours(),
        completionNotes: this.completionNotes,
        quality: this.quality,
        dueDate: this.dueDate,
        isOverdue: this.isOverdue(),
      }),
    );
  }

  /**
   * 取消任务
   */
  cancel(reason) {
    if (this.status === TaskStatus.COMPLETED) {
      throw new Error('Cannot cancel completed task');
    }

    if (this.status === TaskStatus.CANCELLED) {
      throw new Error('Task is already cancelled');
    }

    const oldStatus = this.status;
    this.status = TaskStatus.CANCELLED;
    this.completionNotes = `已取消: ${reason}`;
    this.updatedAt = new Date().toISOString();

    this._addDomainEvent(
      new TaskCancelledEvent({
        taskId: this.id,
        conversationId: this.conversationId,
        requirementId: this.requirementId,
        customerId: this.customerId,
        oldStatus,
        reason,
        cancelledBy: this.assignedTo, // 暂时使用assignedTo，实际应该传入操作人
        type: this.type,
        title: this.title,
        priority: this.priority,
        assignedTo: this.assignedTo,
        assignedToName: this.assignedToName,
        startedAt: this.startedAt,
        elapsedHours: this.getElapsedHours(),
      }),
    );
  }

  /**
   * 更新进度
   */
  updateProgress(progress) {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    if (this.status === TaskStatus.COMPLETED) {
      throw new Error('Cannot update progress of completed task');
    }

    this.progress = progress;
    this.updatedAt = new Date().toISOString();

    // 自动开始任务(如果进度>0且状态为TODO)
    if (progress > 0 && this.status === TaskStatus.TODO) {
      this.start();
    }
  }

  /**
   * 重新分配任务
   */
  reassign(assignedTo, assignedToName, reason) {
    if (this.status === TaskStatus.COMPLETED) {
      throw new Error('Cannot reassign completed task');
    }

    const oldAssignedTo = this.assignedTo;
    this.assignedTo = assignedTo;
    this.assignedToName = assignedToName;
    this.updatedAt = new Date().toISOString();

    this._addDomainEvent(
      new TaskReassignedEvent({
        taskId: this.id,
        conversationId: this.conversationId,
        requirementId: this.requirementId,
        customerId: this.customerId,
        oldAssignedTo,
        oldAssignedToName: this.assignedToName, // 旧的名字
        newAssignedTo: assignedTo,
        newAssignedToName: assignedToName,
        reason,
        reassignedBy: assignedTo, // 暂时使用新assignedTo，实际应该传入操作人
        type: this.type,
        title: this.title,
        priority: this.priority,
        status: this.status,
        dueDate: this.dueDate,
      }),
    );
  }

  /**
   * 更新截止日期
   */
  updateDueDate(dueDate) {
    this.dueDate = dueDate;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 更新优先级
   */
  updatePriority(priority) {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      throw new Error(`Invalid priority: ${priority}`);
    }

    this.priority = priority;
    this.updatedAt = new Date().toISOString();
  }

  // ============ 查询方法 ============

  /**
   * 是否已完成
   */
  isCompleted() {
    return this.status === TaskStatus.COMPLETED;
  }

  /**
   * 是否进行中
   */
  isInProgress() {
    return this.status === TaskStatus.IN_PROGRESS;
  }

  /**
   * 是否已取消
   */
  isCancelled() {
    return this.status === TaskStatus.CANCELLED;
  }

  /**
   * 是否逾期
   */
  isOverdue() {
    if (!this.dueDate || this.isCompleted() || this.isCancelled()) {
      return false;
    }
    return new Date() > new Date(this.dueDate);
  }

  /**
   * 是否紧急
   */
  isUrgent() {
    return this.priority === 'urgent';
  }

  /**
   * 获取已用时间(小时)
   */
  getElapsedHours() {
    if (!this.startedAt) {
      return 0;
    }

    const start = new Date(this.startedAt);
    const end = this.completedAt ? new Date(this.completedAt) : new Date();
    return (end - start) / (1000 * 60 * 60); // 转换为小时
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
