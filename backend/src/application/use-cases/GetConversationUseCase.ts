/**
 * GetConversationUseCase - 获取对话详情用例
 */

import { z } from 'zod';

import { ConversationRepository } from '../../infrastructure/repositories/ConversationRepository';
import { nonEmptyStringSchema, uuidSchema } from '../../infrastructure/validation/CommonSchemas';
import { Validator } from '../../infrastructure/validation/Validator';
import { ResourceAccessControl } from '../services/ResourceAccessControl';
import { ConversationResponseDTO } from '../dto/ConversationResponseDTO';

export interface GetConversationRequest {
  conversationId: string;
  includeMessages?: boolean;
  userId?: string;
}

const GetConversationRequestSchema = z.object({
  conversationId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  includeMessages: z.boolean().optional(),
  userId: uuidSchema.or(nonEmptyStringSchema.max(100)).optional(),
});

export class GetConversationUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly accessControl?: ResourceAccessControl,
  ) {}

  async execute(
    request: GetConversationRequest,
  ): Promise<ConversationResponseDTO> {
    const validatedRequest = Validator.validate(GetConversationRequestSchema, request);

    if (validatedRequest.userId && this.accessControl) {
      await this.accessControl.checkConversationAccess(
        validatedRequest.userId,
        validatedRequest.conversationId,
        'read',
      );
    }

    // 2. 加载聚合根
    const conversation = await this.conversationRepository.findById(
      validatedRequest.conversationId,
    );

    if (!conversation) {
      throw new Error(`Conversation not found: ${validatedRequest.conversationId}`);
    }

    // 3. 转换为DTO
    return ConversationResponseDTO.fromAggregate(
      conversation,
      validatedRequest.includeMessages !== false,
    );
  }
}
