import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface InteractionAddedPayload {
  customerId: string;
  interactionId: string;
  interactionType: string;
  occurredAt: Date;
}

export class InteractionAddedEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: InteractionAddedPayload) {
    super('InteractionAdded', props, payload);
  }
}
