/**
 * RequirementCreatedEventHandler - 需求创建事件处理器
 *
 * 当需求创建后，刷新需求列表UI
 */

export class RequirementCreatedEventHandler {
  /**
   * 处理需求创建事件
   * @param {RequirementCreatedEvent} event - 需求创建事件
   */
  async handle(event) {
    try {
      console.log('[RequirementCreatedEventHandler] 处理需求创建事件:', event.eventId);
      console.log(`[RequirementCreatedEventHandler] 需求: ${event.content}, 来源: ${event.source}, 置信度: ${event.confidence}`);

      // 1. 刷新需求列表UI
      this._refreshRequirementList(event);

      // 2. 如果是自动检测的需求，显示通知
      if (event.source === 'auto-detected') {
        this._showAutoDetectionNotification(event);
      }

      // 3. 如果是高优先级需求，发送提醒
      if (event.priority === 'high') {
        this._sendHighPriorityAlert(event);
      }
    } catch (error) {
      console.error('[RequirementCreatedEventHandler] 处理事件失败:', error);
    }
  }

  /**
   * 刷新需求列表
   * @private
   */
  _refreshRequirementList(event) {
    // 触发UI更新（通过自定义DOM事件）
    const customEvent = new CustomEvent('requirement-created', {
      detail: {
        requirementId: event.requirementId,
        content: event.content,
        source: event.source,
        priority: event.priority,
        confidence: event.confidence,
        conversationId: event.conversationId,
      },
    });
    document.dispatchEvent(customEvent);

    console.log('[RequirementCreatedEventHandler] 已触发需求列表更新');
  }

  /**
   * 显示自动检测通知
   * @private
   */
  _showAutoDetectionNotification(event) {
    const confidencePercent = Math.round(event.confidence * 100);
    console.log(`[RequirementCreatedEventHandler] 🤖 AI自动检测到需求 (置信度: ${confidencePercent}%): ${event.content}`);

    // 可选：显示toast通知
    // showToast(`AI检测到新需求 (${confidencePercent}%): ${event.content.substring(0, 50)}...`);
  }

  /**
   * 发送高优先级警报
   * @private
   */
  _sendHighPriorityAlert(event) {
    console.warn(`
╔════════════════════════════════════════╗
║        高优先级需求提醒                ║
╠════════════════════════════════════════╣
║ 需求ID: ${event.requirementId.padEnd(27)} ║
║ 内容: ${event.content.substring(0, 29).padEnd(29)} ║
║ 来源: ${(event.source === 'manual' ? '手动创建' : 'AI检测').padEnd(29)} ║
║ 置信度: ${String(Math.round(event.confidence * 100)).padEnd(26)}% ║
╚════════════════════════════════════════╝
    `);

    // 浏览器通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('高优先级需求', {
        body: event.content.substring(0, 100),
        icon: '/assets/icons/requirement.png',
        tag: `req-${event.requirementId}`,
      });
    }
  }
}
