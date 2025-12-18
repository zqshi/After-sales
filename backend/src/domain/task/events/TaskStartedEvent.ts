import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface TaskStartedPayload {
  taskId: string;
  startedAt: Date;
  startedBy?: string;
}

export class TaskStartedEvent extends DomainEvent<TaskStartedPayload> {
  constructor(props: DomainEventProps, payload: TaskStartedPayload) {
    super('TaskStarted', props, payload);
  }
}
