import { AggregateRoot } from '@domain/shared/AggregateRoot';

import { TaskCancelledEvent } from '../events/TaskCancelledEvent';
import { TaskCompletedEvent } from '../events/TaskCompletedEvent';
import { TaskCreatedEvent } from '../events/TaskCreatedEvent';
import { TaskReassignedEvent } from '../events/TaskReassignedEvent';
import { TaskStartedEvent } from '../events/TaskStartedEvent';
import { QualityScore } from '../value-objects/QualityScore';
import { TaskPriority } from '../value-objects/TaskPriority';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface TaskProps {
  title: string;
  type?: string;
  assigneeId?: string;
  conversationId?: string;
  requirementId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  qualityScore?: QualityScore;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export class Task extends AggregateRoot<TaskProps> {
  private constructor(props: TaskProps, id?: string, version?: number) {
    super(props, id, version);
  }

  static create(data: {
    title: string;
    type?: string;
    assigneeId?: string;
    conversationId?: string;
    requirementId?: string;
    priority?: TaskPriority;
    dueDate?: Date;
    metadata?: Record<string, unknown>;
  }): Task {
    const now = new Date();
    const priority = data.priority ?? TaskPriority.create('medium');
    const task = new Task({
      title: data.title.trim(),
      type: data.type,
      assigneeId: data.assigneeId,
      conversationId: data.conversationId,
      requirementId: data.requirementId,
      status: 'pending',
      priority,
      dueDate: data.dueDate,
      qualityScore: undefined,
      createdAt: now,
      updatedAt: now,
      metadata: data.metadata ?? {},
    });

    task.addDomainEvent(
      new TaskCreatedEvent(
        { aggregateId: task.id },
        {
          taskId: task.id,
          title: task.props.title,
          assigneeId: task.props.assigneeId,
          priority: task.props.priority.value,
        },
      ),
    );
    return task;
  }

  get title(): string {
    return this.props.title;
  }

  get status(): TaskStatus {
    return this.props.status;
  }

  get assigneeId(): string | undefined {
    return this.props.assigneeId;
  }

  get priority(): TaskPriority {
    return this.props.priority;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get startedAt(): Date | undefined {
    return this.props.startedAt;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata;
  }

  get dueDate(): Date | undefined {
    return this.props.dueDate;
  }

  get qualityScore(): QualityScore | undefined {
    return this.props.qualityScore;
  }

  start(executorId?: string): void {
    if (this.props.status !== 'pending') {
      throw new Error('Only pending tasks can be started');
    }
    this.props.status = 'in_progress';
    this.props.startedAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new TaskStartedEvent(
        { aggregateId: this.id },
        {
          taskId: this.id,
          startedAt: this.props.startedAt,
          startedBy: executorId,
        },
      ),
    );
  }

  complete(score?: QualityScore): void {
    if (this.props.status === 'completed') {
      return;
    }

    this.props.status = 'completed';
    this.props.completedAt = new Date();
    this.props.qualityScore = score;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new TaskCompletedEvent(
        { aggregateId: this.id },
        {
          taskId: this.id,
          conversationId: this.props.conversationId,  // 包含conversationId用于跨域协调
          completedAt: this.props.completedAt,
          qualityScore: score?.overall,
        },
      ),
    );
  }

  cancel(reason?: string): void {
    if (this.props.status === 'cancelled') {
      return;
    }

    this.props.status = 'cancelled';
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new TaskCancelledEvent(
        { aggregateId: this.id },
        {
          taskId: this.id,
          cancelledAt: new Date(),
          reason,
        },
      ),
    );
  }

  reassign(newAssigneeId: string): void {
    const previous = this.props.assigneeId;
    this.props.assigneeId = newAssigneeId;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new TaskReassignedEvent(
        { aggregateId: this.id },
        {
          taskId: this.id,
          previousAssignee: previous,
          currentAssignee: newAssigneeId,
          reassignedAt: new Date(),
        },
      ),
    );
  }

  updatePriority(priority: TaskPriority): void {
    if (this.props.priority.equals(priority)) {
      return;
    }
    this.props.priority = priority;
    this.props.updatedAt = new Date();
  }

  /**
   * 业务方法：判断任务是否超期
   */
  isOverdue(): boolean {
    if (!this.props.dueDate) {
      return false; // 无截止日期，不算超期
    }
    if (this.props.status === 'completed' || this.props.status === 'cancelled') {
      return false; // 已完成或已取消，不算超期
    }
    return new Date() > this.props.dueDate;
  }

  /**
   * 业务方法：判断是否可以完成
   *
   * 规则：
   * 1. 状态必须是in_progress
   * 2. 如果有质检分要求，必须达标（>= 70分）
   */
  canComplete(qualityScore?: QualityScore): boolean {
    if (this.props.status !== 'in_progress') {
      return false;
    }

    // 如果提供了质检分，检查是否达标
    if (qualityScore && qualityScore.overall < 70) {
      return false; // 质检不达标，不能完成
    }

    return true;
  }

  /**
   * 业务方法：判断是否高优先级
   */
  isHighPriority(): boolean {
    return this.props.priority.isHigh();
  }

  /**
   * 业务方法：计算任务耗时（分钟）
   *
   * @returns 任务耗时（分钟），如果未完成则返回当前已耗时
   */
  calculateDuration(): number {
    if (!this.props.startedAt) {
      return 0; // 未开始
    }

    const endTime = this.props.completedAt ?? new Date();
    const durationMs = endTime.getTime() - this.props.startedAt.getTime();
    return Math.round(durationMs / (1000 * 60)); // 转换为分钟
  }

  /**
   * 业务方法：判断是否需要升级
   *
   * 规则：
   * 1. 已超期 → 需要升级
   * 2. in_progress状态，且已运行超过2小时 → 需要升级
   * 3. pending状态，且创建超过1小时未处理 → 需要升级
   */
  needsEscalation(): boolean {
    // 规则1: 超期任务需要升级
    if (this.isOverdue()) {
      return true;
    }

    const now = new Date();

    // 规则2: in_progress超过2小时
    if (this.props.status === 'in_progress' && this.props.startedAt) {
      const runningMinutes = Math.round(
        (now.getTime() - this.props.startedAt.getTime()) / (1000 * 60),
      );
      if (runningMinutes > 120) {
        return true;
      }
    }

    // 规则3: pending超过1小时
    if (this.props.status === 'pending') {
      const pendingMinutes = Math.round(
        (now.getTime() - this.props.createdAt.getTime()) / (1000 * 60),
      );
      if (pendingMinutes > 60) {
        return true;
      }
    }

    return false;
  }

  /**
   * 业务方法：判断是否可以重新分配
   *
   * 规则：
   * 1. 状态必须是pending或in_progress
   * 2. 不能是已完成或已取消
   */
  canReassign(): boolean {
    return (
      this.props.status === 'pending' || this.props.status === 'in_progress'
    );
  }

  /**
   * 业务方法：判断任务是否属于某个对话
   */
  belongsToConversation(conversationId: string): boolean {
    return this.props.conversationId === conversationId;
  }

  /**
   * 业务方法：判断任务是否关联某个需求
   */
  isLinkedToRequirement(requirementId: string): boolean {
    return this.props.requirementId === requirementId;
  }

  /**
   * 业务方法：获取任务状态描述
   */
  getStatusDescription(): string {
    const statusMap: Record<TaskStatus, string> = {
      pending: '待处理',
      in_progress: '处理中',
      completed: '已完成',
      cancelled: '已取消',
    };
    return statusMap[this.props.status];
  }

  /**
   * 业务方法：计算剩余时间（分钟）
   *
   * @returns 剩余时间（分钟），如果已超期返回负数
   */
  calculateRemainingTime(): number | null {
    if (!this.props.dueDate) {
      return null; // 无截止日期
    }
    if (this.props.status === 'completed' || this.props.status === 'cancelled') {
      return null; // 已完成或已取消
    }

    const now = new Date();
    const remainingMs = this.props.dueDate.getTime() - now.getTime();
    return Math.round(remainingMs / (1000 * 60)); // 转换为分钟（可能为负）
  }

  static rehydrate(props: TaskProps, id: string, version?: number): Task {
    return new Task(props, id, version);
  }
}
