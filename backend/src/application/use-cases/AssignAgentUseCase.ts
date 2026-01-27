import { z } from 'zod';

import { EventBus } from '../../infrastructure/events/EventBus';
import { ConversationRepository } from '../../infrastructure/repositories/ConversationRepository';
import { nonEmptyStringSchema, uuidSchema } from '../../infrastructure/validation/CommonSchemas';
import { Validator } from '../../infrastructure/validation/Validator';
import { ResourceAccessControl } from '../services/ResourceAccessControl';
import { ConversationResponseDTO } from '../dto/ConversationResponseDTO';

export interface AssignAgentRequest {
  conversationId: string;
  agentId: string;
  assignedBy?: string;
  reason?: 'manual' | 'auto' | 'reassign';
  userId?: string;
}

const AssignAgentRequestSchema = z.object({
  conversationId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  agentId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  assignedBy: uuidSchema.or(nonEmptyStringSchema.max(100)).optional(),
  reason: z.enum(['manual', 'auto', 'reassign']).optional(),
  userId: uuidSchema.or(nonEmptyStringSchema.max(100)).optional(),
});

export class AssignAgentUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly eventBus: EventBus,
    private readonly accessControl?: ResourceAccessControl,
  ) {}

  async execute(request: AssignAgentRequest): Promise<ConversationResponseDTO> {
    const validatedRequest = Validator.validate(AssignAgentRequestSchema, request);

    if (validatedRequest.userId && this.accessControl) {
      await this.accessControl.checkConversationAccess(
        validatedRequest.userId,
        validatedRequest.conversationId,
        'write',
      );
    }

    const conversation = await this.conversationRepository.findById(
      validatedRequest.conversationId,
    );

    if (!conversation) {
      throw new Error(`Conversation not found: ${validatedRequest.conversationId}`);
    }

    conversation.assignAgent(validatedRequest.agentId, {
      assignedBy: validatedRequest.assignedBy,
      reason: validatedRequest.reason,
    });

    const events = conversation.getUncommittedEvents();
    await this.conversationRepository.save(conversation);

    await this.eventBus.publishAll(events);
    conversation.clearEvents();

    return ConversationResponseDTO.fromAggregate(conversation);
  }
}
