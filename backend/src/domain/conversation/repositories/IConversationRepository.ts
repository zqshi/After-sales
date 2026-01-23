import { Conversation } from '@domain/conversation/models/Conversation';

export interface IConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: string): Promise<Conversation | null>;
  findByCustomerId(customerId: string): Promise<Conversation[]>;
  getEvents(conversationId: string): Promise<Record<string, unknown>[]>;
  updateMessageReceipt(
    messageId: string,
    receipt: {
      status: 'delivered' | 'read' | 'failed';
      source?: string;
      metadata?: Record<string, unknown>;
      receivedAt: Date;
    },
    conversationId?: string,
  ): Promise<void>;
}
