/**
 * KnowledgeItemCreatedEventHandler - 知识创建事件处理器
 *
 * 用于通知前端知识面板刷新
 */
export class KnowledgeItemCreatedEventHandler {
  async handle(event) {
    try {
      console.log('[KnowledgeItemCreatedEventHandler] 新知识创建:', event.knowledgeId);
      const customEvent = new CustomEvent('knowledge-item-created', {
        detail: {
          knowledgeId: event.knowledgeId,
          title: event.title,
        },
      });
      document.dispatchEvent(customEvent);
    } catch (error) {
      console.error('[KnowledgeItemCreatedEventHandler] 处理事件失败:', error);
    }
  }
}
