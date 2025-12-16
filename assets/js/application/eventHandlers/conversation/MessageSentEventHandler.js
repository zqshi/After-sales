/**
 * MessageSentEventHandler - 消息发送事件处理器
 *
 * 当客户消息发送后，自动检测需求并创建需求卡片
 */

import { RequirementDetectorService } from '../../../domains/requirement/services/RequirementDetectorService.js';
import { getContainer } from '../../container/bootstrap.js';

export class MessageSentEventHandler {
  constructor() {
    this.requirementDetector = new RequirementDetectorService();
    const container = getContainer();
    this.requirementService = container.resolve('requirementApplicationService');
  }

  /**
   * 处理消息发送事件
   * @param {MessageSentEvent} event - 消息发送事件
   */
  async handle(event) {
    try {
      console.log('[MessageSentEventHandler] 处理消息发送事件:', event.eventId);

      // 仅处理客户消息
      if (event.senderType !== 'external') {
        console.log('[MessageSentEventHandler] 忽略内部消息');
        return;
      }

      // 检测需求
      const requirements = this.requirementDetector.detectFromText(event.content);

      // 如果检测到需求，创建需求卡片
      for (const req of requirements) {
        console.log('[MessageSentEventHandler] 检测到需求:', req.content, '置信度:', req.confidence);

        // 只有高置信度的需求才自动创建
        if (req.confidence >= 0.7) {
          await this.requirementService.createRequirement({
            content: req.content,
            source: 'auto-detected',
            conversationId: event.conversationId,
            customerId: event.customerId || null,
            priority: this._mapConfidenceToPriority(req.confidence),
            confidence: req.confidence,
          });

          console.log('[MessageSentEventHandler] 已创建需求卡片');
        } else {
          console.log('[MessageSentEventHandler] 置信度不足，未自动创建需求');
        }
      }
    } catch (error) {
      console.error('[MessageSentEventHandler] 处理事件失败:', error);
    }
  }

  /**
   * 映射置信度到优先级
   * @private
   */
  _mapConfidenceToPriority(confidence) {
    if (confidence >= 0.9) {
      return 'high';
    }
    if (confidence >= 0.7) {
      return 'medium';
    }
    return 'low';
  }
}
