/**
 * CreateConversationUseCase - 创建对话用例
 *
 * 负责编排聚合根创建、初始消息并发布领域事件
 */

import { Conversation } from '@domain/conversation/models/Conversation';
import { Channel } from '@domain/conversation/value-objects/Channel';

import { EventBus } from '../../infrastructure/events/EventBus';
import { ConversationRepository } from '../../infrastructure/repositories/ConversationRepository';
import { ConversationResponseDTO } from '../dto/ConversationResponseDTO';
import {
  CreateConversationRequestDTO,
  CreateConversationRequestSchema,
  InitialMessageSenderType,
} from '../dto/CreateConversationRequestDTO';
import { Validator } from '../../infrastructure/validation/Validator';

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
    const validatedRequest = Validator.validate(CreateConversationRequestSchema, request);

    const channel = Channel.fromString(validatedRequest.channel);
    const slaDeadline = validatedRequest.slaDeadline ? new Date(validatedRequest.slaDeadline) : undefined;

    if (validatedRequest.slaDeadline && slaDeadline && Number.isNaN(slaDeadline.getTime())) {
      throw new Error('invalid slaDeadline');
    }

    const conversation = Conversation.create({
      customerId: validatedRequest.customerId,
      channel,
      agentId: validatedRequest.agentId,
      priority: validatedRequest.priority,
      slaDeadline,
      metadata: validatedRequest.metadata,
      mode: validatedRequest.mode,
    });

    if (validatedRequest.initialMessage) {
      const senderType = SENDER_TYPE_MAP[validatedRequest.initialMessage.senderType ?? 'external'];

      conversation.sendMessage({
        senderId: validatedRequest.initialMessage.senderId,
        senderType,
        content: validatedRequest.initialMessage.content,
        metadata: validatedRequest.initialMessage.metadata,
      });
    }

    const events = conversation.getUncommittedEvents();
    await this.conversationRepository.save(conversation);

    await this.eventBus.publishAll(events);
    conversation.clearEvents();

    return ConversationResponseDTO.fromAggregate(conversation);
  }

}
