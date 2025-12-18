import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface MessageSentPayload {
  messageId: string;
  senderId: string;
  senderType: string;
  content: string;
  contentType: string;
}

export class MessageSentEvent extends DomainEvent<MessageSentPayload> {
  public readonly conversationId: string;
  public readonly messageId: string;
  public readonly senderId: string;
  public readonly senderType: string;
  public readonly content: string;
  public readonly contentType: string;
  constructor(props: DomainEventProps, payload: MessageSentPayload) {
    super('MessageSent', props, payload);
    this.conversationId = props.aggregateId;
    this.messageId = payload.messageId;
    this.senderId = payload.senderId;
    this.senderType = payload.senderType;
    this.content = payload.content;
    this.contentType = payload.contentType;
  }
}
