import { AggregateRoot } from '@domain/shared/AggregateRoot';
import { TaskCreatedEvent } from '../events/TaskCreatedEvent';
import { TaskStartedEvent } from '../events/TaskStartedEvent';
import { TaskCompletedEvent } from '../events/TaskCompletedEvent';
import { TaskCancelledEvent } from '../events/TaskCancelledEvent';
import { TaskReassignedEvent } from '../events/TaskReassignedEvent';
import { TaskPriority } from '../value-objects/TaskPriority';
import { QualityScore } from '../value-objects/QualityScore';

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
  private constructor(props: TaskProps, id?: string) {
    super(props, id);
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

  static rehydrate(props: TaskProps, id: string): Task {
    return new Task(props, id);
  }
}
