/**
 * SLAViolatedEventHandler - SLA违规事件处理器
 *
 * 当对话SLA违规时，发送通知并记录
 */

import { getContainer } from '../../container/bootstrap.js';

export class SLAViolatedEventHandler {
  constructor() {
    const container = getContainer();
    this.profileService = container.resolve('customerProfileApplicationService');
  }

  /**
   * 处理SLA违规事件
   * @param {SLAViolatedEvent} event - SLA违规事件
   */
  async handle(event) {
    try {
      console.log('[SLAViolatedEventHandler] 处理SLA违规事件:', event.eventId);
      console.warn(`⚠️ SLA违规警告: 对话${event.conversationId}, 等待时长: ${event.waitingTime}分钟`);

      // 1. 显示通知（UI层）
      this._showNotification(event);

      // 2. 如果有客户ID，更新客户风险等级
      if (event.customerId) {
        await this._updateCustomerRisk(event);
      }

      // 3. 记录违规日志（TODO: 待实现日志服务）
      console.log('[SLAViolatedEventHandler] SLA违规已记录');
    } catch (error) {
      console.error('[SLAViolatedEventHandler] 处理事件失败:', error);
    }
  }

  /**
   * 显示通知
   * @private
   */
  _showNotification(event) {
    // 浏览器通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('SLA违规警告', {
        body: `对话 ${event.conversationId} 已超时 ${event.waitingTime} 分钟`,
        icon: '/assets/icons/warning.png',
        tag: `sla-${event.conversationId}`,
      });
    }

    // 控制台警告
    console.warn(`
╔════════════════════════════════════════╗
║        SLA 违规警告                    ║
╠════════════════════════════════════════╣
║ 对话ID: ${event.conversationId.padEnd(24)} ║
║ 等待时长: ${String(event.waitingTime).padEnd(22)}分钟 ║
║ 严重程度: ${event.severity.padEnd(22)} ║
╚════════════════════════════════════════╝
    `);
  }

  /**
   * 更新客户风险等级
   * @private
   */
  async _updateCustomerRisk(event) {
    try {
      // 刷新客户画像，触发风险等级重新计算
      await this.profileService.refreshProfile({
        customerId: event.customerId,
        profileData: {
          insights: [
            {
              title: 'SLA违规风险',
              desc: `对话响应超时 ${event.waitingTime} 分钟`,
              action: '立即跟进',
            },
          ],
        },
        triggeredBy: 'sla-monitor',
      });

      console.log('[SLAViolatedEventHandler] 客户风险等级已更新');
    } catch (error) {
      console.error('[SLAViolatedEventHandler] 更新客户风险失败:', error);
    }
  }
}
