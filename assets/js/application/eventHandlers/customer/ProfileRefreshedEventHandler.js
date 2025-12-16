/**
 * ProfileRefreshedEventHandler - 客户画像刷新事件处理器
 *
 * 当客户画像刷新后，更新UI显示
 */

export class ProfileRefreshedEventHandler {
  /**
   * 处理画像刷新事件
   * @param {ProfileRefreshedEvent} event - 画像刷新事件
   */
  async handle(event) {
    try {
      console.log('[ProfileRefreshedEventHandler] 处理画像刷新事件:', event.eventId);
      console.log('[ProfileRefreshedEventHandler] 更新字段:', event.updatedFields);

      // 1. 刷新客户画像面板
      this._refreshProfilePanel(event);

      // 2. 显示更新通知
      if (event.updatedFields.length > 0) {
        this._showUpdateNotification(event);
      }
    } catch (error) {
      console.error('[ProfileRefreshedEventHandler] 处理事件失败:', error);
    }
  }

  /**
   * 刷新客户画像面板
   * @private
   */
  _refreshProfilePanel(event) {
    // 触发UI更新（通过自定义DOM事件）
    const customEvent = new CustomEvent('customer-profile-updated', {
      detail: {
        customerId: event.customerId,
        updatedFields: event.updatedFields,
        timestamp: event.refreshedAt,
      },
    });
    document.dispatchEvent(customEvent);

    console.log('[ProfileRefreshedEventHandler] 已触发UI更新事件');
  }

  /**
   * 显示更新通知
   * @private
   */
  _showUpdateNotification(event) {
    const fieldNames = {
      name: '客户名称',
      title: '职位',
      focus: '关注点',
      contacts: '联系方式',
      sla: 'SLA信息',
      products: '产品列表',
      metrics: '业务指标',
      insights: '洞察信息',
    };

    const updatedFieldsText = event.updatedFields
      .map(field => fieldNames[field] || field)
      .join('、');

    console.log(`[ProfileRefreshedEventHandler] 客户画像已更新: ${updatedFieldsText}`);

    // 可选：显示toast通知
    // showToast(`客户画像已更新: ${updatedFieldsText}`);
  }
}
