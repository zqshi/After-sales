export type ConversationListStatus = 'open' | 'pending' | 'closed';
export type ConversationSLAStatus = 'normal' | 'warning' | 'violated';

export interface ConversationListQueryDTO {
  status?: ConversationListStatus;
  agentId?: string;
  customerId?: string;
  channel?: string;
  slaStatus?: ConversationSLAStatus;
  page?: number;
  limit?: number;
}
