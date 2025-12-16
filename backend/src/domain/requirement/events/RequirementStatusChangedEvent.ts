import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface RequirementStatusChangedPayload {
  requirementId: string;
  previousStatus: string;
  currentStatus: string;
  updatedAt: Date;
}

export class RequirementStatusChangedEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: RequirementStatusChangedPayload) {
    super('RequirementStatusChanged', props, payload);
  }
}
