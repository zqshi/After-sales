/**
 * CreateConversationUseCase - 创建对话用例
 *
 * 负责编排聚合根创建、初始消息并发布领域事件
 */

import { Conversation } from '@domain/conversation/models/Conversation';
import { Channel } from '@domain/conversation/value-objects/Channel';
import { ConversationRepository } from '../../infrastructure/repositories/ConversationRepository';
import { EventBus } from '../../infrastructure/events/EventBus';
import { ConversationResponseDTO } from '../dto/ConversationResponseDTO';
import { CreateConversationRequestDTO, InitialMessageSenderType } from '../dto/CreateConversationRequestDTO';

type SenderTypeMap = Record<InitialMessageSenderType, 'agent' | 'customer'>;

const SENDER_TYPE_MAP: SenderTypeMap = {
  internal: 'agent',
  external: 'customer',
};

export class CreateConversationUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(request: CreateConversationRequestDTO): Promise<ConversationResponseDTO> {
    this.validateRequest(request);

    const channel = Channel.fromString(request.channel);
    const slaDeadline = request.slaDeadline ? new Date(request.slaDeadline) : undefined;

    if (request.slaDeadline && slaDeadline && Number.isNaN(slaDeadline.getTime())) {
      throw new Error('invalid slaDeadline');
    }

    const conversation = Conversation.create({
      customerId: request.customerId,
      channel,
      agentId: request.agentId,
      priority: request.priority,
      slaDeadline,
      metadata: request.metadata,
    });

    if (request.initialMessage) {
      const senderType = SENDER_TYPE_MAP[request.initialMessage.senderType ?? 'external'];

      conversation.sendMessage({
        senderId: request.initialMessage.senderId,
        senderType,
        content: request.initialMessage.content,
        metadata: request.initialMessage.metadata,
      });
    }

    await this.conversationRepository.save(conversation);

    const events = conversation.getUncommittedEvents();
    await this.eventBus.publishAll(events);
    conversation.clearEvents();

    return ConversationResponseDTO.fromAggregate(conversation);
  }

  private validateRequest(request: CreateConversationRequestDTO): void {
    if (!request.customerId) {
      throw new Error('customerId is required');
    }
    if (!request.channel) {
      throw new Error('channel is required');
    }
    if (request.priority && !['low', 'normal', 'high'].includes(request.priority)) {
      throw new Error('invalid priority');
    }

    if (request.initialMessage) {
      if (!request.initialMessage.senderId) {
        throw new Error('initialMessage.senderId is required');
      }
      if (!request.initialMessage.content || request.initialMessage.content.trim() === '') {
        throw new Error('initialMessage.content is required');
      }
      if (request.initialMessage.senderType && !['internal', 'external'].includes(request.initialMessage.senderType)) {
        throw new Error('initialMessage.senderType is invalid');
      }
    }
  }
}
