/**
 * CustomerProfileController - 客户画像控制器
 *
 * 表现层控制器的职责：
 * 1. 处理用户输入
 * 2. 调用应用服务
 * 3. 更新UI
 */

import { getContainer } from '../../application/container/bootstrap.js';
import { RefreshProfileCommand } from '../../application/customer/commands/RefreshProfileCommand.js';
import { AddServiceRecordCommand } from '../../application/customer/commands/AddServiceRecordCommand.js';
import { GetProfileQuery } from '../../application/customer/queries/GetProfileQuery.js';

export class CustomerProfileController {
  constructor() {
    const container = getContainer();
    this.profileService = container.resolve('customerProfileApplicationService');
  }

  /**
   * 刷新客户画像
   * @param {Object} data - 画像数据
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshProfile(data) {
    try {
      const command = new RefreshProfileCommand({
        customerId: data.customerId,
        profileData: data.profileData,
        triggeredBy: data.triggeredBy,
      });

      const result = await this.profileService.refreshProfile(command);
      return result;
    } catch (error) {
      console.error('[CustomerProfileController] refreshProfile error:', error);
      throw error;
    }
  }

  /**
   * 添加服务记录
   * @param {Object} data - 服务记录数据
   * @returns {Promise<Object>} 添加结果
   */
  async addServiceRecord(data) {
    try {
      const command = new AddServiceRecordCommand({
        customerId: data.customerId,
        title: data.title,
        status: data.status,
        owner: data.owner,
        relatedConversationIds: data.relatedConversationIds,
      });

      const result = await this.profileService.addServiceRecord(command);
      return result;
    } catch (error) {
      console.error('[CustomerProfileController] addServiceRecord error:', error);
      throw error;
    }
  }

  /**
   * 更新承诺进度
   * @param {Object} data - 承诺进度数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateCommitmentProgress(data) {
    try {
      const result = await this.profileService.updateCommitmentProgress({
        customerId: data.customerId,
        commitmentId: data.commitmentId,
        progress: data.progress,
      });
      return result;
    } catch (error) {
      console.error('[CustomerProfileController] updateCommitmentProgress error:', error);
      throw error;
    }
  }

  /**
   * 添加互动记录
   * @param {Object} data - 互动记录数据
   * @returns {Promise<Object>} 添加结果
   */
  async addInteraction(data) {
    try {
      const result = await this.profileService.addInteraction({
        customerId: data.customerId,
        interaction: data.interaction,
      });
      return result;
    } catch (error) {
      console.error('[CustomerProfileController] addInteraction error:', error);
      throw error;
    }
  }

  /**
   * 标记为VIP客户
   * @param {Object} data - VIP标记数据
   * @returns {Promise<Object>} 标记结果
   */
  async markAsVIP(data) {
    try {
      const result = await this.profileService.markAsVIP({
        customerId: data.customerId,
        reason: data.reason,
        vipLevel: data.vipLevel,
        markedBy: data.markedBy,
      });
      return result;
    } catch (error) {
      console.error('[CustomerProfileController] markAsVIP error:', error);
      throw error;
    }
  }

  /**
   * 获取客户画像
   * @param {Object} data - 查询数据
   * @returns {Promise<Object>} 客户画像
   */
  async getProfile(data) {
    try {
      const query = new GetProfileQuery({
        customerId: data.customerId,
        includeHistory: data.includeHistory,
        includeInsights: data.includeInsights,
      });

      const result = await this.profileService.getProfile(query);
      return result;
    } catch (error) {
      console.error('[CustomerProfileController] getProfile error:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const customerProfileController = new CustomerProfileController();
