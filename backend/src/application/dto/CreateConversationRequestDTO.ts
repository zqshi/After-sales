export type InitialMessageSenderType = 'internal' | 'external';

export interface InitialMessageDTO {
  senderId: string;
  senderType?: InitialMessageSenderType;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface CreateConversationRequestDTO {
  customerId: string;
  channel: string;
  agentId?: string;
  priority?: 'low' | 'normal' | 'high';
  slaDeadline?: string;
  metadata?: Record<string, unknown>;
  initialMessage?: InitialMessageDTO;
}
