import { Entity } from '@domain/shared/Entity';

export type SenderType = 'agent' | 'customer';

export interface MessageProps {
  conversationId: string;
  senderId: string;
  senderType: SenderType;
  content: string;
  contentType: string;
  metadata?: Record<string, unknown>;
  sentAt: Date;
}

export class Message extends Entity<MessageProps> {
  private constructor(props: MessageProps, id?: string) {
    super(props, id);
  }

  static create(data: {
    conversationId: string;
    senderId: string;
    senderType: SenderType;
    content: string;
    contentType?: string;
    metadata?: Record<string, unknown>;
  }): Message {
    const props: MessageProps = {
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderType: data.senderType,
      content: data.content,
      contentType: data.contentType || 'text',
      metadata: data.metadata,
      sentAt: new Date(),
    };

    return new Message(props);
  }

  static rehydrate(props: MessageProps, id: string): Message {
    return new Message(props, id);
  }

  get conversationId(): string {
    return this.props.conversationId;
  }

  get senderId(): string {
    return this.props.senderId;
  }

  get senderType(): SenderType {
    return this.props.senderType;
  }

  get content(): string {
    return this.props.content;
  }

  get contentType(): string {
    return this.props.contentType;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata;
  }

  get sentAt(): Date {
    return this.props.sentAt;
  }
}
