/**
 * KnowledgeItemUpdatedEventHandler - 知识更新事件处理器
 */
export class KnowledgeItemUpdatedEventHandler {
  async handle(event) {
    try {
      console.log('[KnowledgeItemUpdatedEventHandler] 知识更新:', event.knowledgeId, event.changes);
    } catch (error) {
      console.error('[KnowledgeItemUpdatedEventHandler] 处理事件失败:', error);
    }
  }
}
