import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface MessageSentPayload {
  messageId: string;
  senderId: string;
  senderType: string;
  content: string;
  contentType: string;
}

export class MessageSentEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: MessageSentPayload) {
    super('MessageSent', props, payload);
  }
}
