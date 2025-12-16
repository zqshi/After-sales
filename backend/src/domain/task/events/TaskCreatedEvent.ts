import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface TaskCreatedPayload {
  taskId: string;
  title: string;
  assigneeId?: string;
  priority: string;
}

export class TaskCreatedEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: TaskCreatedPayload) {
    super('TaskCreated', props, payload);
  }
}
