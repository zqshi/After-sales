import { Conversation, AgentMode } from '@domain/conversation/models/Conversation';
import { Message, SenderType } from '@domain/conversation/models/Message';
import { ConversationStatus, MessagePriority, CustomerLevelStatus } from '@domain/conversation/types';
import { Channel } from '@domain/conversation/value-objects/Channel';
import { ConversationEntity } from '@infrastructure/database/entities/ConversationEntity';
import { MessageEntity } from '@infrastructure/database/entities/MessageEntity';

export class ConversationMapper {
  static toEntity(conversation: Conversation): ConversationEntity {
    const entity = new ConversationEntity();
    entity.id = conversation.id;
    entity.customerId = conversation.customerId;
    entity.agentId = conversation.agentId || null;
    entity.channel = conversation.channel.value;
    entity.status = conversation.status;
    entity.priority = conversation.priority;
    entity.slaStatus = conversation.slaStatus;
    entity.slaDeadline = conversation.slaDeadline ?? null;
    entity.mode = conversation.mode || 'agent_auto';
    entity.closedAt = conversation.closedAt ?? null;
    entity.createdAt = conversation.createdAt;
    entity.updatedAt = conversation.updatedAt;
    entity.metadata = conversation.metadata || {};

    entity.messages = conversation.messages.map((message) => {
      const messageEntity = new MessageEntity();
      messageEntity.id = message.id;
      messageEntity.senderId = message.senderId;
      messageEntity.senderType = message.senderType;
      messageEntity.content = message.content;
      messageEntity.contentType = message.contentType;
      messageEntity.sentAt = message.sentAt;
      messageEntity.metadata = message.metadata ?? {};
      messageEntity.conversationId = conversation.id;
      messageEntity.conversation = entity;
      return messageEntity;
    });

    return entity;
  }

  static toDomain(entity: ConversationEntity): Conversation {
    const messages: Message[] = (entity.messages || []).map((messageEntity) =>
      Message.rehydrate(
        {
          conversationId: entity.id,
          senderId: messageEntity.senderId,
          senderType: messageEntity.senderType as SenderType,
          content: messageEntity.content,
          contentType: messageEntity.contentType,
          metadata: messageEntity.metadata,
          sentAt: messageEntity.sentAt,
        },
        messageEntity.id,
      ),
    );

    return Conversation.rehydrate(
      {
        customerId: entity.customerId,
        agentId: entity.agentId ?? undefined,
        channel: Channel.fromString(entity.channel),
        status: entity.status as ConversationStatus,
        priority: entity.priority as MessagePriority,
        slaStatus: entity.slaStatus as CustomerLevelStatus,
        slaDeadline: entity.slaDeadline ?? undefined,
        mode: (entity.mode as AgentMode) ?? 'agent_auto',
        messages,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        closedAt: entity.closedAt ?? undefined,
        metadata: entity.metadata ?? {},
      },
      entity.id,
    );
  }
}
