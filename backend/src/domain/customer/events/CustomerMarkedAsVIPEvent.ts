import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface CustomerMarkedAsVIPPayload {
  customerId: string;
  markedAt: Date;
  reason?: string;
}

export class CustomerMarkedAsVIPEvent extends DomainEvent<CustomerMarkedAsVIPPayload> {
  constructor(props: DomainEventProps, payload: CustomerMarkedAsVIPPayload) {
    super('CustomerMarkedAsVIP', props, payload);
  }
}
