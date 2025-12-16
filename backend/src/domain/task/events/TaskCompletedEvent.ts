import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface TaskCompletedPayload {
  taskId: string;
  completedAt: Date;
  qualityScore?: number;
}

export class TaskCompletedEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: TaskCompletedPayload) {
    super('TaskCompleted', props, payload);
  }
}
