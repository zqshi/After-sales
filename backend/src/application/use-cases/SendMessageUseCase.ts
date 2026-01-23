/**
 * SendMessageUseCase - 发送消息用例
 *
 * 应用层用例：编排领域对象完成业务操作
 */

import { ConversationRepository } from '../../infrastructure/repositories/ConversationRepository';
import { EventBus } from '../../infrastructure/events/EventBus';

export interface SendMessageRequest {
  conversationId: string;
  senderId: string;
  senderType: 'internal' | 'external';
  content: string;
  metadata?: Record<string, unknown>;
  conversationMetadata?: Record<string, unknown>;
}

export interface SendMessageResponse {
  success: boolean;
  messageId: string;
  conversationId: string;
  timestamp: string;
  message: {
    id: string;
    senderId: string;
    senderType: string;
    content: string;
    contentType: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
  };
}

export class SendMessageUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(request: SendMessageRequest): Promise<SendMessageResponse> {
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
    const senderType = request.senderType === 'internal' ? 'agent' : 'customer';
    if (request.conversationMetadata) {
      conversation.mergeMetadata(request.conversationMetadata);
    }

    conversation.sendMessage({
      senderId: request.senderId,
      senderType,
      content: request.content,
      metadata: request.metadata,
    });

    // 4. 发布领域事件（先抓取后保存）
    const events = conversation.getUncommittedEvents();

    // 5. 保存聚合根
    await this.conversationRepository.save(conversation);

    // 6. 发布领域事件
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    conversation.clearEvents();

    // 6. 返回结果
    const lastMessage = conversation.messages[conversation.messages.length - 1];

    const messagePayload = {
      id: lastMessage.id,
      senderId: lastMessage.senderId,
      senderType: lastMessage.senderType,
      content: lastMessage.content,
      contentType: lastMessage.contentType,
      metadata: lastMessage.metadata,
      timestamp: lastMessage.sentAt.toISOString(),
    };

    return {
      success: true,
      messageId: lastMessage.id,
      conversationId: conversation.id,
      timestamp: lastMessage.sentAt.toISOString(),
      message: messagePayload,
    };
  }

  private validateRequest(request: SendMessageRequest): void {
    if (!request.conversationId) {
      throw new Error('conversationId is required');
    }
    if (!request.senderId) {
      throw new Error('senderId is required');
    }
    if (!request.senderType) {
      throw new Error('senderType is required');
    }
    if (!request.content || request.content.trim() === '') {
      throw new Error('content is required');
    }
    if (!['internal', 'external'].includes(request.senderType)) {
      throw new Error('invalid senderType');
    }
  }
}
