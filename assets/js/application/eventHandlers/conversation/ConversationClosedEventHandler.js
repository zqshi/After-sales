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
    this.taskService = container.resolve('taskService');
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

      // 如果对话触发客户等级规则，创建质检任务
      if (event.slaViolated) {
        console.log('[ConversationClosedEventHandler] 检测到客户等级规则异常，创建质检任务');
        try {
          const task = await this.taskService.createTask({
            type: 'quality-check',
            title: `对话客户等级异常质检 - ${event.conversationId}`,
            priority: 'high',
            conversationId: event.conversationId,
            description: `该对话触发客户等级规则异常，需要进行质量检查。对话ID: ${event.conversationId}`,
          });
          console.log('[ConversationClosedEventHandler] 已创建质检任务:', task.id);
        } catch (error) {
          console.error('[ConversationClosedEventHandler] 创建质检任务失败:', error);
        }
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
