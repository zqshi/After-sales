import { Conversation } from '@domain/conversation/models/Conversation';

export interface ConversationLastMessageDTO {
  id: string;
  senderId: string;
  senderType: string;
  content: string;
  timestamp: string;
}

export interface ConversationListItemDTO {
  id: string;
  customerId: string;
  agentId?: string;
  channel: string;
  status: string;
  priority: string;
  slaStatus: string;
  issueDescription?: string;
  relatedProduct?: string;
  tags?: string[];
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  lastMessage?: ConversationLastMessageDTO;
}

export class ConversationListResponseDTO {
  items: ConversationListItemDTO[];
  total: number;
  page: number;
  limit: number;

  static from(
    conversations: Conversation[],
    total: number,
    page: number,
    limit: number,
  ): ConversationListResponseDTO {
    const dto = new ConversationListResponseDTO();
    dto.items = conversations.map((conversation) => {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      const metadata = conversation.metadata ?? {};
      const issueDescription = (metadata as { issueDescription?: string }).issueDescription;
      const relatedProduct = (metadata as { relatedProduct?: string }).relatedProduct;
      const tags = (metadata as { tags?: string[] }).tags;
      const unreadCount = (metadata as { unreadCount?: number }).unreadCount;

      return {
        id: conversation.id,
        customerId: conversation.customerId,
        agentId: conversation.agentId,
        channel: conversation.channel.value,
        status: conversation.status,
        priority: conversation.priority,
        slaStatus: conversation.slaStatus,
        issueDescription,
        relatedProduct,
        tags: Array.isArray(tags) ? tags : [],
        unreadCount: typeof unreadCount === 'number' ? unreadCount : 0,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        closedAt: conversation.closedAt?.toISOString(),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              senderId: lastMessage.senderId,
              senderType: lastMessage.senderType,
              content: lastMessage.content,
              timestamp: lastMessage.sentAt.toISOString(),
            }
          : undefined,
      };
    });
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
