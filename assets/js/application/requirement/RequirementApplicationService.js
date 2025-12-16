/**
 * RequirementApplicationService - 需求应用服务
 *
 * 应用服务的职责：
 * 1. 编排需求相关的业务用例
 * 2. 管理事务边界
 * 3. 发布领域事件
 */

import { Requirement } from '../../domains/requirement/models/Requirement.js';
import { generateId } from '../../core/utils.js';

export class RequirementApplicationService {
  constructor({ requirementRepository, eventBus }) {
    this.requirementRepository = requirementRepository;
    this.eventBus = eventBus;
  }

  /**
   * 创建需求用例
   * @param {CreateRequirementCommand} command - 创建需求命令
   * @returns {Promise<Object>} 创建结果
   */
  async createRequirement(command) {
    try {
      // 1. 创建聚合根
      const requirementId = `REQ-${generateId()}`;
      const requirement = new Requirement({
        id: requirementId,
        content: command.content,
        source: command.source,
        conversationId: command.conversationId,
        customerId: command.customerId,
        priority: command.priority,
        confidence: command.confidence,
        status: 'pending',
        createdAt: command.timestamp,
      });

      // 2. 保存聚合根
      await this.requirementRepository.save(requirement);

      // 3. 发布领域事件
      const events = requirement.getDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      requirement.clearDomainEvents();

      // 4. 返回结果
      return {
        success: true,
        requirementId: requirement.id,
        content: requirement.content,
        status: requirement.status,
        confidence: requirement.confidence,
      };
    } catch (error) {
      console.error('[RequirementApplicationService] createRequirement error:', error);
      throw error;
    }
  }

  /**
   * 更新需求状态用例
   * @param {Object} data - 状态更新数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateRequirementStatus(data) {
    try {
      // 1. 加载聚合根
      const requirement = await this.requirementRepository.findById(data.requirementId);
      if (!requirement) {
        throw new Error(`需求不存在: ${data.requirementId}`);
      }

      // 2. 执行领域逻辑（根据不同状态转换）
      switch (data.newStatus) {
        case 'processing':
          requirement.startProcessing(data.assignedTo);
          break;
        case 'completed':
          requirement.complete(data.resolution);
          break;
        case 'rejected':
          requirement.reject(data.reason);
          break;
        default:
          throw new Error(`不支持的状态转换: ${data.newStatus}`);
      }

      // 3. 保存聚合根
      await this.requirementRepository.save(requirement);

      // 4. 发布领域事件
      const events = requirement.getDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      requirement.clearDomainEvents();

      // 5. 返回结果
      return {
        success: true,
        requirementId: requirement.id,
        oldStatus: data.oldStatus,
        newStatus: requirement.status,
      };
    } catch (error) {
      console.error('[RequirementApplicationService] updateRequirementStatus error:', error);
      throw error;
    }
  }

  /**
   * 获取需求列表查询
   * @param {GetRequirementListQuery} query - 获取需求列表查询
   * @returns {Promise<Array>} 需求列表
   */
  async getRequirementList(query) {
    try {
      const filters = {};

      if (query.status !== 'all') {
        filters.status = query.status;
      }
      if (query.source !== 'all') {
        filters.source = query.source;
      }

      filters.limit = query.limit;
      filters.offset = query.offset;

      const requirements = await this.requirementRepository.findAll(filters);

      return {
        total: requirements.length,
        items: requirements.map(req => ({
          id: req.id,
          content: req.content,
          status: req.status,
          source: req.source,
          priority: req.priority,
          confidence: req.confidence,
          conversationId: req.conversationId,
          customerId: req.customerId,
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
        })),
        filters: {
          status: query.status,
          source: query.source,
          limit: query.limit,
          offset: query.offset,
        },
      };
    } catch (error) {
      console.error('[RequirementApplicationService] getRequirementList error:', error);
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
      const requirement = await this.requirementRepository.findById(requirementId);
      if (!requirement) {
        throw new Error(`需求不存在: ${requirementId}`);
      }

      return {
        id: requirement.id,
        content: requirement.content,
        status: requirement.status,
        source: requirement.source,
        priority: requirement.priority,
        confidence: requirement.confidence,
        conversationId: requirement.conversationId,
        customerId: requirement.customerId,
        assignedTo: requirement.assignedTo,
        createdAt: requirement.createdAt,
        updatedAt: requirement.updatedAt,
      };
    } catch (error) {
      console.error('[RequirementApplicationService] getRequirement error:', error);
      throw error;
    }
  }
}
