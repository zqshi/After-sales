/**
 * GetConversationUseCase - 获取对话详情用例
 */

import { ConversationRepository } from '../../infrastructure/repositories/ConversationRepository';
import { ConversationResponseDTO } from '../dto/ConversationResponseDTO';

export interface GetConversationRequest {
  conversationId: string;
  includeMessages?: boolean;
}

export class GetConversationUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async execute(
    request: GetConversationRequest,
  ): Promise<ConversationResponseDTO> {
    // 1. 验证输入
    if (!request.conversationId) {
      throw new Error('conversationId is required');
    }

    // 2. 加载聚合根
    const conversation = await this.conversationRepository.findById(
      request.conversationId,
    );

    if (!conversation) {
      throw new Error(`Conversation not found: ${request.conversationId}`);
    }

    // 3. 转换为DTO
    return ConversationResponseDTO.fromAggregate(
      conversation,
      request.includeMessages !== false,
    );
  }
}
