import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface TaskCancelledPayload {
  taskId: string;
  cancelledAt: Date;
  reason?: string;
}

export class TaskCancelledEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: TaskCancelledPayload) {
    super('TaskCancelled', props, payload);
  }
}
