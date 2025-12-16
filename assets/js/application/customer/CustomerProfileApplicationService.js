/**
 * CustomerProfileApplicationService - 客户画像应用服务
 *
 * 应用服务的职责：
 * 1. 编排客户画像相关的业务用例
 * 2. 管理事务边界
 * 3. 发布领域事件
 */

export class CustomerProfileApplicationService {
  constructor({ profileRepository, eventBus }) {
    this.profileRepository = profileRepository;
    this.eventBus = eventBus;
  }

  /**
   * 刷新客户画像用例
   * @param {RefreshProfileCommand} command - 刷新画像命令
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshProfile(command) {
    try {
      // 1. 加载聚合根
      const profile = await this.profileRepository.findById(command.customerId);
      if (!profile) {
        throw new Error(`客户画像不存在: ${command.customerId}`);
      }

      // 2. 执行领域逻辑
      profile.refresh(command.profileData);

      // 3. 保存聚合根
      await this.profileRepository.save(profile);

      // 4. 发布领域事件
      const events = profile.getDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      profile.clearDomainEvents();

      // 5. 返回结果
      return {
        success: true,
        customerId: profile.conversationId,
        updatedAt: profile.updatedAt,
        riskLevel: profile.getRiskLevel(),
      };
    } catch (error) {
      console.error('[CustomerProfileApplicationService] refreshProfile error:', error);
      throw error;
    }
  }

  /**
   * 添加服务记录用例
   * @param {AddServiceRecordCommand} command - 添加服务记录命令
   * @returns {Promise<Object>} 添加结果
   */
  async addServiceRecord(command) {
    try {
      // 1. 加载聚合根
      const profile = await this.profileRepository.findById(command.customerId);
      if (!profile) {
        throw new Error(`客户画像不存在: ${command.customerId}`);
      }

      // 2. 执行领域逻辑
      profile.addServiceRecord({
        title: command.title,
        status: command.status,
        owner: command.owner,
        relatedConversations: command.relatedConversationIds,
      });

      // 3. 保存聚合根
      await this.profileRepository.save(profile);

      // 4. 发布领域事件
      const events = profile.getDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      profile.clearDomainEvents();

      // 5. 返回结果
      const newRecord = profile.serviceRecords[profile.serviceRecords.length - 1];
      return {
        success: true,
        customerId: profile.conversationId,
        serviceRecordId: newRecord.id,
        serviceRecordCount: profile.serviceRecords.length,
      };
    } catch (error) {
      console.error('[CustomerProfileApplicationService] addServiceRecord error:', error);
      throw error;
    }
  }

  /**
   * 更新承诺进度用例
   * @param {Object} data - 承诺进度数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateCommitmentProgress(data) {
    try {
      // 1. 加载聚合根
      const profile = await this.profileRepository.findById(data.customerId);
      if (!profile) {
        throw new Error(`客户画像不存在: ${data.customerId}`);
      }

      // 2. 执行领域逻辑
      profile.updateCommitmentProgress(data.commitmentId, data.progress);

      // 3. 保存聚合根
      await this.profileRepository.save(profile);

      // 4. 发布领域事件
      const events = profile.getDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      profile.clearDomainEvents();

      // 5. 返回结果
      const commitment = profile.commitments.find(c => c.id === data.commitmentId);
      return {
        success: true,
        customerId: profile.conversationId,
        commitmentId: data.commitmentId,
        progress: commitment.progress,
        status: commitment.status,
      };
    } catch (error) {
      console.error('[CustomerProfileApplicationService] updateCommitmentProgress error:', error);
      throw error;
    }
  }

  /**
   * 添加互动记录用例
   * @param {Object} data - 互动记录数据
   * @returns {Promise<Object>} 添加结果
   */
  async addInteraction(data) {
    try {
      // 1. 加载聚合根
      const profile = await this.profileRepository.findById(data.customerId);
      if (!profile) {
        throw new Error(`客户画像不存在: ${data.customerId}`);
      }

      // 2. 执行领域逻辑
      profile.addInteraction(data.interaction);

      // 3. 保存聚合根
      await this.profileRepository.save(profile);

      // 4. 发布领域事件
      const events = profile.getDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      profile.clearDomainEvents();

      // 5. 返回结果
      return {
        success: true,
        customerId: profile.conversationId,
        interactionCount: profile.interactions.length,
      };
    } catch (error) {
      console.error('[CustomerProfileApplicationService] addInteraction error:', error);
      throw error;
    }
  }

  /**
   * 标记为VIP客户用例
   * @param {Object} data - VIP标记数据
   * @returns {Promise<Object>} 标记结果
   */
  async markAsVIP(data) {
    try {
      // 1. 加载聚合根
      const profile = await this.profileRepository.findById(data.customerId);
      if (!profile) {
        throw new Error(`客户画像不存在: ${data.customerId}`);
      }

      // 2. 执行领域逻辑
      profile.markAsVIP(data.reason, data.vipLevel, data.markedBy);

      // 3. 保存聚合根
      await this.profileRepository.save(profile);

      // 4. 发布领域事件
      const events = profile.getDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      profile.clearDomainEvents();

      // 5. 返回结果
      return {
        success: true,
        customerId: profile.conversationId,
        isVIP: profile.isVIP(),
        vipLevel: data.vipLevel,
      };
    } catch (error) {
      console.error('[CustomerProfileApplicationService] markAsVIP error:', error);
      throw error;
    }
  }

  /**
   * 获取客户画像查询
   * @param {GetProfileQuery} query - 获取画像查询
   * @returns {Promise<Object>} 客户画像数据
   */
  async getProfile(query) {
    try {
      const profile = await this.profileRepository.findById(query.customerId);
      if (!profile) {
        throw new Error(`客户画像不存在: ${query.customerId}`);
      }

      return {
        conversationId: profile.conversationId,
        name: profile.name,
        title: profile.title,
        tags: profile.tags,
        isVIP: profile.isVIP(),
        riskLevel: profile.getRiskLevel(),
        contacts: profile.contacts,
        sla: profile.sla,
        metrics: profile.metrics,
        insights: query.includeInsights ? profile.insights : [],
        interactions: profile.interactions,
        serviceRecords: profile.serviceRecords,
        commitments: profile.commitments,
        history: query.includeHistory ? profile.history : [],
        stats: {
          activeServices: profile.getActiveServiceCount(),
          pendingCommitments: profile.getPendingCommitmentsCount(),
          hasHighRisk: profile.hasHighRiskCommitments(),
        },
      };
    } catch (error) {
      console.error('[CustomerProfileApplicationService] getProfile error:', error);
      throw error;
    }
  }
}
