/**
 * SendMessageUseCase - 发送消息用例
 *
 * 应用层用例：编排领域对象完成业务操作
 */

import { EventBus } from '../../infrastructure/events/EventBus';
import { ConversationRepository } from '../../infrastructure/repositories/ConversationRepository';
import { Validator } from '../../infrastructure/validation/Validator';
import { SendMessageRequestSchema, SendMessageRequestDTO } from '../dto/SendMessageRequestDTO';

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
    // 1. 验证输入（使用 Zod）
    const validatedRequest = Validator.validate(SendMessageRequestSchema, request);

    // 2. 加载聚合根
    const conversation = await this.conversationRepository.findById(
      validatedRequest.conversationId,
    );

    if (!conversation) {
      throw new Error(`Conversation not found: ${validatedRequest.conversationId}`);
    }

    // 3. 执行领域逻辑
    const senderType = validatedRequest.senderType === 'internal' ? 'agent' : 'customer';
    if (validatedRequest.conversationMetadata) {
      conversation.mergeMetadata(validatedRequest.conversationMetadata);
    }

    conversation.sendMessage({
      senderId: validatedRequest.senderId,
      senderType,
      content: validatedRequest.content,
      metadata: validatedRequest.metadata,
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

    // 7. 返回结果
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
}
