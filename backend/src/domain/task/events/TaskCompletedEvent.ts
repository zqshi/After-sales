import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface TaskCompletedPayload {
  taskId: string;
  conversationId?: string;  // 关联的会话ID，用于跨域事件协调
  completedAt: Date;
  qualityScore?: number;
}

export class TaskCompletedEvent extends DomainEvent<TaskCompletedPayload> {
  constructor(props: DomainEventProps, payload: TaskCompletedPayload) {
    super('TaskCompleted', props, payload);
  }
}
