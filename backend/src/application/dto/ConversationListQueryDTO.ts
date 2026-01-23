export type ConversationListStatus = 'open' | 'pending' | 'closed';
export type ConversationCustomerLevelStatus = 'normal' | 'warning' | 'violated';

export interface ConversationListQueryDTO {
  status?: ConversationListStatus;
  agentId?: string;
  customerId?: string;
  channel?: string;
  slaStatus?: ConversationCustomerLevelStatus;
  page?: number;
  limit?: number;
}
