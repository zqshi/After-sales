import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface ConversationClosedPayload {
  resolution: string;
  closedAt: Date;
}

export class ConversationClosedEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: ConversationClosedPayload) {
    super('ConversationClosed', props, payload);
  }
}
