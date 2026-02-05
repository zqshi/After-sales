import { Conversation } from '@domain/conversation/models/Conversation';
import { ConversationStatus, CustomerLevelStatus } from '@domain/conversation/types';

export interface ConversationFilters {
  status?: ConversationStatus;
  agentId?: string;
  customerId?: string;
  channel?: string;
  slaStatus?: CustomerLevelStatus;
}

export interface IConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: string): Promise<Conversation | null>;
  findByCustomerId(customerId: string): Promise<Conversation[]>;
  getEvents(conversationId: string): Promise<Record<string, unknown>[]>;
  findByFilters(filters: ConversationFilters, pagination: { limit: number; offset: number }): Promise<Conversation[]>;
  countByFilters(filters?: ConversationFilters): Promise<number>;
}
