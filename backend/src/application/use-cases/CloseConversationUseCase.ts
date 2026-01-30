/**
 * CloseConversationUseCase - 关闭对话用例
 */

import { z } from 'zod';

import { EventBus } from '../../infrastructure/events/EventBus';
import { ConversationRepository } from '../../infrastructure/repositories/ConversationRepository';
import { nonEmptyStringSchema, uuidSchema } from '../../infrastructure/validation/CommonSchemas';
import { ValidationError, Validator } from '../../infrastructure/validation/Validator';
import { isImChannel } from '@domain/conversation/constants';
import { ResourceAccessControl } from '../services/ResourceAccessControl';

export interface CloseConversationRequest {
  conversationId: string;
  closedBy: string;
  reason?: string;
  userId?: string;
}

export interface CloseConversationResponse {
  success: boolean;
  conversationId: string;
  status: string;
  closedAt: string;
}

export class CloseConversationUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly eventBus: EventBus,
    private readonly accessControl?: ResourceAccessControl,
  ) {}

  async execute(
    request: CloseConversationRequest,
  ): Promise<CloseConversationResponse> {
    const validatedRequest = Validator.validate(CloseConversationRequestSchema, request);

    if (validatedRequest.userId && this.accessControl) {
      await this.accessControl.checkConversationAccess(
        validatedRequest.userId,
        validatedRequest.conversationId,
        'write',
      );
    }

    // 2. 加载聚合根
    const conversation = await this.conversationRepository.findById(
      validatedRequest.conversationId,
    );

    if (!conversation) {
      throw new Error(`Conversation not found: ${validatedRequest.conversationId}`);
    }

    if (isImChannel(conversation.channel.value)) {
      throw new ValidationError('IM渠道不支持关闭对话操作，请使用问题生命周期管理', [
        { field: 'conversationId', message: 'IM渠道不允许关闭对话' },
      ]);
    }

    // 3. 执行领域逻辑
    const resolution = validatedRequest.reason || `Closed by ${validatedRequest.closedBy}`;
    conversation.close(resolution);

    // 4. 发布领域事件（先抓取，保存后事件会被清空）
    const events = conversation.getUncommittedEvents();

    // 5. 保存聚合根
    await this.conversationRepository.save(conversation);

    // 6. 发布领域事件
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    conversation.clearEvents();

    // 6. 返回结果
    return {
      success: true,
      conversationId: conversation.id,
      status: conversation.status,
      closedAt: conversation.closedAt?.toISOString() || '',
    };
  }
}

const CloseConversationRequestSchema = z.object({
  conversationId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  closedBy: nonEmptyStringSchema.max(100),
  reason: z.string().max(500).optional(),
  userId: uuidSchema.or(nonEmptyStringSchema.max(100)).optional(),
});
