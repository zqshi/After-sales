import { ConversationRepository } from '../../infrastructure/repositories/ConversationRepository';
import { EventBus } from '../../infrastructure/events/EventBus';
import { ConversationResponseDTO } from '../dto/ConversationResponseDTO';

export interface AssignAgentRequest {
  conversationId: string;
  agentId: string;
  assignedBy?: string;
  reason?: 'manual' | 'auto' | 'reassign';
}

export class AssignAgentUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(request: AssignAgentRequest): Promise<ConversationResponseDTO> {
    this.validateRequest(request);

    const conversation = await this.conversationRepository.findById(
      request.conversationId,
    );

    if (!conversation) {
      throw new Error(`Conversation not found: ${request.conversationId}`);
    }

    conversation.assignAgent(request.agentId, {
      assignedBy: request.assignedBy,
      reason: request.reason,
    });

    const events = conversation.getUncommittedEvents();
    await this.conversationRepository.save(conversation);

    await this.eventBus.publishAll(events);
    conversation.clearEvents();

    return ConversationResponseDTO.fromAggregate(conversation);
  }

  private validateRequest(request: AssignAgentRequest): void {
    if (!request.conversationId) {
      throw new Error('conversationId is required');
    }
    if (!request.agentId) {
      throw new Error('agentId is required');
    }
    if (
      request.reason &&
      !['manual', 'auto', 'reassign'].includes(request.reason)
    ) {
      throw new Error('invalid reason');
    }
  }
}
