/**
 * CloseConversationUseCase - 关闭对话用例
 */

import { ConversationRepository } from '../../infrastructure/repositories/ConversationRepository';
import { EventBus } from '../../infrastructure/events/EventBus';

export interface CloseConversationRequest {
  conversationId: string;
  closedBy: string;
  reason?: string;
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
  ) {}

  async execute(
    request: CloseConversationRequest,
  ): Promise<CloseConversationResponse> {
    // 1. 验证输入
    this.validateRequest(request);

    // 2. 加载聚合根
    const conversation = await this.conversationRepository.findById(
      request.conversationId,
    );

    if (!conversation) {
      throw new Error(`Conversation not found: ${request.conversationId}`);
    }

    // 3. 执行领域逻辑
    const resolution = request.reason || `Closed by ${request.closedBy}`;
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

  private validateRequest(request: CloseConversationRequest): void {
    if (!request.conversationId) {
      throw new Error('conversationId is required');
    }
    if (!request.closedBy) {
      throw new Error('closedBy is required');
    }
  }
}
