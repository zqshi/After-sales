import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface TaskReassignedPayload {
  taskId: string;
  previousAssignee?: string;
  currentAssignee: string;
  reassignedAt: Date;
}

export class TaskReassignedEvent extends DomainEvent<TaskReassignedPayload> {
  constructor(props: DomainEventProps, payload: TaskReassignedPayload) {
    super('TaskReassigned', props, payload);
  }
}
