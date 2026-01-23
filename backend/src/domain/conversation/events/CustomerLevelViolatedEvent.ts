import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface CustomerLevelViolatedPayload {
  deadline: Date;
  violatedAt: Date;
  details?: string;
}

export class CustomerLevelViolatedEvent extends DomainEvent<CustomerLevelViolatedPayload> {
  constructor(props: DomainEventProps, payload: CustomerLevelViolatedPayload) {
    super('CustomerLevelViolated', props, payload);
  }
}
