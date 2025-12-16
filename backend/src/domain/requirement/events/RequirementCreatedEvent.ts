import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface RequirementCreatedPayload {
  requirementId: string;
  customerId: string;
  title: string;
  category: string;
  source: string;
}

export class RequirementCreatedEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: RequirementCreatedPayload) {
    super('RequirementCreated', props, payload);
  }
}
