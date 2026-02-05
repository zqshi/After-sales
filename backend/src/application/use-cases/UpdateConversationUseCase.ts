import { IConversationRepository } from '@domain/conversation/repositories/IConversationRepository';
import { ConversationStatus } from '@domain/conversation/types';
import { AgentMode } from '@domain/conversation/models/Conversation';

export class UpdateConversationUseCase {
  constructor(private readonly conversationRepository: IConversationRepository) {}

  async execute(input: {
    conversationId: string;
    status?: ConversationStatus;
    mode?: AgentMode;
    metadata?: Record<string, unknown>;
    reason?: string;
  }) {
    const conversation = await this.conversationRepository.findById(input.conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${input.conversationId} not found`);
    }

    if (input.mode) {
      conversation.setMode(input.mode);
    }

    if (input.metadata) {
      conversation.mergeMetadata(input.metadata);
    }

    if (input.status) {
      conversation.updateStatus(input.status, input.reason);
    }

    await this.conversationRepository.save(conversation);

    return conversation;
  }
}
