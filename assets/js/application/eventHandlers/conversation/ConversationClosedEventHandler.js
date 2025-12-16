/**
 * ConversationClosedEventHandler - 对话关闭事件处理器
 *
 * 当对话关闭后，更新客户画像并记录互动
 */

import { getContainer } from '../../container/bootstrap.js';

export class ConversationClosedEventHandler {
  constructor() {
    const container = getContainer();
    this.profileService = container.resolve('customerProfileApplicationService');
  }

  /**
   * 处理对话关闭事件
   * @param {ConversationClosedEvent} event - 对话关闭事件
   */
  async handle(event) {
    try {
      console.log('[ConversationClosedEventHandler] 处理对话关闭事件:', event.eventId);

      // 如果事件包含客户ID，则更新客户画像
      if (!event.customerId) {
        console.log('[ConversationClosedEventHandler] 无客户ID，跳过画像更新');
        return;
      }

      // 添加互动记录
      await this.profileService.addInteraction({
        customerId: event.customerId,
        interaction: {
          type: '对话',
          title: event.title || '客户对话',
          channel: event.channel || '在线客服',
          result: this._determineResult(event),
          date: event.closedAt,
          conversationId: event.conversationId,
        },
      });

      console.log('[ConversationClosedEventHandler] 已添加互动记录到客户画像');

      // 如果对话有SLA违规，创建质检任务（TODO: 待实现任务模块）
      if (event.slaViolated) {
        console.log('[ConversationClosedEventHandler] 检测到SLA违规，应创建质检任务');
        // await this.taskService.createTask({
        //   type: 'quality-check',
        //   title: `对话SLA违规质检 - ${event.conversationId}`,
        //   conversationId: event.conversationId,
        // });
      }
    } catch (error) {
      console.error('[ConversationClosedEventHandler] 处理事件失败:', error);
    }
  }

  /**
   * 判断对话结果
   * @private
   */
  _determineResult(event) {
    if (event.resolution === 'resolved') {
      return '已解决';
    }
    if (event.resolution === 'escalated') {
      return '已升级';
    }
    return '进行中';
  }
}
