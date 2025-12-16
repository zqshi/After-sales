/**
 * RiskLevelChangedEventHandler - 风险等级变更事件处理器
 *
 * 当客户风险等级变化时，发送警报并更新UI
 */

export class RiskLevelChangedEventHandler {
  /**
   * 处理风险等级变更事件
   * @param {RiskLevelChangedEvent} event - 风险等级变更事件
   */
  async handle(event) {
    try {
      console.log('[RiskLevelChangedEventHandler] 处理风险等级变更事件:', event.eventId);
      console.log(`[RiskLevelChangedEventHandler] 风险等级: ${event.oldLevel} → ${event.newLevel}`);

      // 1. 如果是升级风险，发送警报
      if (event.isEscalated()) {
        this._sendRiskAlert(event);
      }

      // 2. 更新UI显示
      this._updateRiskIndicator(event);

      // 3. 如果达到高风险，自动采取措施
      if (event.isCritical()) {
        await this._handleCriticalRisk(event);
      }
    } catch (error) {
      console.error('[RiskLevelChangedEventHandler] 处理事件失败:', error);
    }
  }

  /**
   * 发送风险警报
   * @private
   */
  _sendRiskAlert(event) {
    const levelNames = {
      low: '低',
      medium: '中',
      high: '高',
    };

    console.warn(`
╔════════════════════════════════════════╗
║        客户风险等级升级                ║
╠════════════════════════════════════════╣
║ 客户ID: ${event.customerId.padEnd(27)} ║
║ 风险变化: ${levelNames[event.oldLevel].padEnd(2)} → ${levelNames[event.newLevel].padEnd(21)} ║
║ 原因: ${event.reason.padEnd(29)} ║
║ 触发方式: ${(event.triggerType === 'auto' ? '自动' : '手动').padEnd(25)} ║
╚════════════════════════════════════════╝
    `);

    // 浏览器通知
    if (event.isCritical() && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('高风险客户警报', {
        body: `客户 ${event.customerId} 风险等级升级为高风险\n原因: ${event.reason}`,
        icon: '/assets/icons/alert.png',
        tag: `risk-${event.customerId}`,
        requireInteraction: true,
      });
    }
  }

  /**
   * 更新风险指示器
   * @private
   */
  _updateRiskIndicator(event) {
    // 触发UI更新（通过自定义DOM事件）
    const customEvent = new CustomEvent('customer-risk-changed', {
      detail: {
        customerId: event.customerId,
        oldLevel: event.oldLevel,
        newLevel: event.newLevel,
        reason: event.reason,
      },
    });
    document.dispatchEvent(customEvent);

    console.log('[RiskLevelChangedEventHandler] 已触发UI风险指示器更新');
  }

  /**
   * 处理高风险情况
   * @private
   */
  async _handleCriticalRisk(_event) {
    console.log('[RiskLevelChangedEventHandler] 检测到高风险客户，自动采取措施');

    // 1. 标记为重点客户（如果尚未标记）
    // 2. 通知客户成功团队
    // 3. 创建跟进任务

    // TODO: 这些操作需要相应的服务支持
    console.log('[RiskLevelChangedEventHandler] 高风险处理措施待实现');
  }
}
