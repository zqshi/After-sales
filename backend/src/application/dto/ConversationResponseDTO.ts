/**
 * ConversationResponseDTO - 对话响应数据传输对象
 *
 * 用于在应用层和表现层之间传输数据
 */

import { Conversation } from '../../domain/conversation/models/Conversation';

export interface MessageDTO {
  id: string;
  senderId: string;
  senderType: string;
  content: string;
  timestamp: string;
}

export interface ParticipantDTO {
  id: string;
  name: string;
  role: string;
}

export interface CustomerLevelInfoDTO {
  status: string;
  responseTime: number;
  threshold: number;
  violated: boolean;
}

export class ConversationResponseDTO {
  id: string;
  title: string;
  status: string;
  channel: string;
  participants: ParticipantDTO[];
  messages: MessageDTO[];
  slaInfo: CustomerLevelInfoDTO;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;

  static fromAggregate(
    conversation: Conversation,
    includeMessages: boolean = true,
  ): ConversationResponseDTO {
    const dto = new ConversationResponseDTO();

    dto.id = conversation.id;
    const metadata = conversation.metadata ?? {};
    dto.title = (metadata as { title?: string }).title ?? 'Conversation';
    dto.status = conversation.status;
    dto.channel = conversation.channel.value;

    const declaredParticipants =
      (conversation as { participants?: ParticipantDTO[] }).participants;
    const derivedParticipants: ParticipantDTO[] =
      declaredParticipants && declaredParticipants.length
        ? declaredParticipants
        : [
          {
            id: conversation.customerId,
            name: 'Customer',
            role: 'customer',
          },
          ...(
            conversation.agentId
              ? [
                {
                  id: conversation.agentId,
                  name: 'Agent',
                  role: 'agent',
                },
              ]
              : []
          ),
        ];

    dto.participants = derivedParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
    }));

    dto.messages = includeMessages
      ? conversation.messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderType: m.senderType,
        content: m.content,
        timestamp: m.sentAt.toISOString(),
      }))
      : [];

    const slaInfo = conversation.getCustomerLevelInfo();
    dto.slaInfo = {
      status: slaInfo.status,
      responseTime: slaInfo.responseTime,
      threshold: slaInfo.threshold,
      violated: slaInfo.violated,
    };

    dto.createdAt = conversation.createdAt.toISOString();
    dto.updatedAt = conversation.updatedAt.toISOString();
    dto.closedAt = conversation.closedAt?.toISOString();

    return dto;
  }
}
