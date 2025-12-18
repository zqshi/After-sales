import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface ConversationCreatedPayload {
  customerId: string;
  channel: string;
  priority: string;
}

export class ConversationCreatedEvent extends DomainEvent<ConversationCreatedPayload> {
  constructor(props: DomainEventProps, payload: ConversationCreatedPayload) {
    super('ConversationCreated', props, payload);
  }
}
