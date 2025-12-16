import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface RequirementPriorityChangedPayload {
  requirementId: string;
  previousPriority: string;
  currentPriority: string;
  changedAt: Date;
}

export class RequirementPriorityChangedEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: RequirementPriorityChangedPayload) {
    super('RequirementPriorityChanged', props, payload);
  }
}
