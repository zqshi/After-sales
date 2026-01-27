import { AiService } from '@application/services/AiService';
import { ConversationReadyToCloseEvent } from '@domain/conversation/events/ConversationReadyToCloseEvent';
import { IConversationRepository } from '@domain/conversation/repositories/IConversationRepository';

/**
 * ConversationReadyToCloseEventHandler
 *
 * 职责：当所有Task完成后，处理Conversation的关闭逻辑
 * 当前实现：自动关闭对话并生成总结
 *
 * TODO (Phase 2增强):
 * 1. 通过IM通知客户问题已解决
 * 2. 等待客户确认或超时后自动关闭
 * 3. 发送满意度调查
 */
export class ConversationReadyToCloseEventHandler {
  constructor(
    private readonly conversationRepository: IConversationRepository,
    private readonly aiService: AiService,
  ) {}

  async handle(event: ConversationReadyToCloseEvent): Promise<void> {
    const { conversationId, reason, completedTasksCount } = event.payload;

    console.log(
      `[ConversationReadyToCloseEventHandler] Processing conversation ready to close: ${conversationId}`,
    );

    try {
      // 1. 获取Conversation
      const conversation = await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        console.warn(
          `[ConversationReadyToCloseEventHandler] Conversation ${conversationId} not found`,
        );
        return;
      }

      // 如果已经关闭，跳过
      if (conversation.status === 'closed') {
        console.log(
          `[ConversationReadyToCloseEventHandler] Conversation ${conversationId} is already closed`,
        );
        return;
      }

      // 2. 生成对话总结（使用AI服务）
      let summary = reason;
      try {
        const aiSummary = await this.aiService.summarizeConversation(conversationId);
        if (aiSummary) {
          summary = aiSummary;
        }
      } catch (error) {
        console.warn(
          `[ConversationReadyToCloseEventHandler] Failed to generate AI summary, using default reason`,
        );
      }

      // 3. 关闭Conversation
      const resolution = completedTasksCount
        ? `所有${completedTasksCount}个任务已完成。${summary}`
        : summary;

      conversation.close(resolution);

      // 4. 保存Conversation
      await this.conversationRepository.save(conversation);

      console.log(
        `[ConversationReadyToCloseEventHandler] Conversation ${conversationId} closed successfully`,
      );

      // TODO Phase 2: 通知客户（需要IM集成）
      // await this.imGatewayService.sendMessage(conversationId, `您的问题已全部解决。${summary}`);

      // TODO Phase 2: 知识库沉淀
      // await this.knowledgeExtractionService.extractFromConversation(conversationId);

      // TODO Phase 2: 发送满意度调查
      // await this.satisfactionSurveyService.send(conversationId);
    } catch (error) {
      console.error(
        `[ConversationReadyToCloseEventHandler] Error processing conversation ready to close:`,
        error,
      );
      throw error;
    }
  }
}
