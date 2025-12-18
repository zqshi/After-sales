import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface ConversationClosedPayload {
  resolution: string;
  closedAt: Date;
}

export class ConversationClosedEvent extends DomainEvent<ConversationClosedPayload> {
  public readonly conversationId: string;
  public readonly resolution: string;
  public readonly reason: string;
  public readonly closedAt: Date;
  constructor(props: DomainEventProps, payload: ConversationClosedPayload) {
    super('ConversationClosed', props, payload);
    this.conversationId = props.aggregateId;
    this.resolution = payload.resolution;
    this.reason = payload.resolution;
    this.closedAt = payload.closedAt;
  }
}
