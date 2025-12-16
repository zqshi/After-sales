import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface TaskStartedPayload {
  taskId: string;
  startedAt: Date;
  startedBy?: string;
}

export class TaskStartedEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: TaskStartedPayload) {
    super('TaskStarted', props, payload);
  }
}
