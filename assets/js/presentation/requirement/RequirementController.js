/**
 * RequirementController - 需求控制器
 *
 * 表现层控制器的职责：
 * 1. 处理用户输入
 * 2. 调用应用服务
 * 3. 更新UI
 */

import { getContainer } from '../../application/container/bootstrap.js';
import { CreateRequirementCommand } from '../../application/requirement/commands/CreateRequirementCommand.js';
import { GetRequirementListQuery } from '../../application/requirement/queries/GetRequirementListQuery.js';

export class RequirementController {
  constructor() {
    const container = getContainer();
    this.requirementService = container.resolve('requirementApplicationService');
  }

  /**
   * 创建需求
   * @param {Object} data - 需求数据
   * @returns {Promise<Object>} 创建结果
   */
  async createRequirement(data) {
    try {
      const command = new CreateRequirementCommand({
        content: data.content,
        source: data.source,
        conversationId: data.conversationId,
        customerId: data.customerId,
        priority: data.priority,
        confidence: data.confidence,
      });

      const result = await this.requirementService.createRequirement(command);
      return result;
    } catch (error) {
      console.error('[RequirementController] createRequirement error:', error);
      throw error;
    }
  }

  /**
   * 更新需求状态
   * @param {Object} data - 状态更新数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateRequirementStatus(data) {
    try {
      const result = await this.requirementService.updateRequirementStatus({
        requirementId: data.requirementId,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        assignedTo: data.assignedTo,
        resolution: data.resolution,
        reason: data.reason,
      });
      return result;
    } catch (error) {
      console.error('[RequirementController] updateRequirementStatus error:', error);
      throw error;
    }
  }

  /**
   * 获取需求列表
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 需求列表
   */
  async getRequirementList(filters = {}) {
    try {
      const query = new GetRequirementListQuery({
        status: filters.status,
        source: filters.source,
        limit: filters.limit,
        offset: filters.offset,
      });

      const result = await this.requirementService.getRequirementList(query);
      return result;
    } catch (error) {
      console.error('[RequirementController] getRequirementList error:', error);
      throw error;
    }
  }

  /**
   * 获取需求详情
   * @param {string} requirementId - 需求ID
   * @returns {Promise<Object>} 需求详情
   */
  async getRequirement(requirementId) {
    try {
      const result = await this.requirementService.getRequirement(requirementId);
      return result;
    } catch (error) {
      console.error('[RequirementController] getRequirement error:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const requirementController = new RequirementController();
