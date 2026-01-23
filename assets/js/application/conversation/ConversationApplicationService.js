/**
 * ConversationApplicationService - 对话应用服务
 *
 * 应用服务的职责：
 * 1. 编排领域对象完成业务用例
 * 2. 管理事务边界
 * 3. 发布领域事件
 * 4. 协调多个聚合根
 */

export class ConversationApplicationService {
  constructor({ conversationRepository, eventBus }) {
    this.conversationRepository = conversationRepository;
    this.eventBus = eventBus;
  }

  /**
   * 发送消息用例
   * @param {SendMessageCommand} command - 发送消息命令
   * @returns {Promise<Object>} 消息发送结果
   */
  async sendMessage(command) {
    try {
      // 1. 加载聚合根
      const conversation = await this.conversationRepository.findById(command.conversationId);
      if (!conversation) {
        throw new Error(`对话不存在: ${command.conversationId}`);
      }

      // 2. 执行领域逻辑
      conversation.sendMessage({
        senderId: command.senderId,
        senderType: command.senderType,
        content: command.content,
        timestamp: command.timestamp,
      });

      // 3. 保存聚合根
      await this.conversationRepository.save(conversation);

      // 4. 发布领域事件
      const events = conversation.getDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      conversation.clearDomainEvents();

      // 5. 返回结果
      return {
        success: true,
        conversationId: conversation.id,
        messageCount: conversation.messages.length,
        lastMessage: conversation.messages[conversation.messages.length - 1],
      };
    } catch (error) {
      console.error('[ConversationApplicationService] sendMessage error:', error);
      throw error;
    }
  }

  /**
   * 关闭对话用例
   * @param {CloseConversationCommand} command - 关闭对话命令
   * @returns {Promise<Object>} 关闭结果
   */
  async closeConversation(command) {
    try {
      // 1. 加载聚合根
      const conversation = await this.conversationRepository.findById(command.conversationId);
      if (!conversation) {
        throw new Error(`对话不存在: ${command.conversationId}`);
      }

      // 2. 执行领域逻辑
      conversation.close(command.closedBy, command.reason);

      // 3. 保存聚合根
      await this.conversationRepository.save(conversation);

      // 4. 发布领域事件
      const events = conversation.getDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      conversation.clearDomainEvents();

      // 5. 返回结果
      return {
        success: true,
        conversationId: conversation.id,
        status: conversation.status,
        closedAt: conversation.closedAt,
      };
    } catch (error) {
      console.error('[ConversationApplicationService] closeConversation error:', error);
      throw error;
    }
  }

  /**
   * 分配客服用例
   * @param {AssignAgentCommand} command - 分配客服命令
   * @returns {Promise<Object>} 分配结果
   */
  async assignAgent(command) {
    try {
      // 1. 加载聚合根
      const conversation = await this.conversationRepository.findById(command.conversationId);
      if (!conversation) {
        throw new Error(`对话不存在: ${command.conversationId}`);
      }

      // 2. 执行领域逻辑
      conversation.assignAgent({
        agentId: command.agentId,
        agentName: command.agentName,
      });

      // 3. 保存聚合根
      await this.conversationRepository.save(conversation);

      // 4. 发布领域事件
      const events = conversation.getDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      conversation.clearDomainEvents();

      // 5. 返回结果
      return {
        success: true,
        conversationId: conversation.id,
        assignedAgent: conversation.assignedAgent,
      };
    } catch (error) {
      console.error('[ConversationApplicationService] assignAgent error:', error);
      throw error;
    }
  }

  /**
   * 获取对话详情查询
   * @param {GetConversationQuery} query - 获取对话查询
   * @returns {Promise<Object>} 对话详情
   */
  async getConversation(query) {
    try {
      const conversation = await this.conversationRepository.findById(query.conversationId);
      if (!conversation) {
        throw new Error(`对话不存在: ${query.conversationId}`);
      }

      return {
        id: conversation.id,
        title: conversation.title,
        status: conversation.status,
        channel: conversation.channel,
        participants: conversation.participants,
        messages: query.includeMessages ? conversation.messages : [],
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        closedAt: conversation.closedAt,
        slaInfo: conversation.getCustomerLevelInfo(),
      };
    } catch (error) {
      console.error('[ConversationApplicationService] getConversation error:', error);
      throw error;
    }
  }

  /**
   * 获取对话列表
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 对话列表
   */
  async getConversationList(filters = {}) {
    try {
      const conversations = await this.conversationRepository.findAll(filters);
      return conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        status: conv.status,
        channel: conv.channel,
        messageCount: conv.messages.length,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        slaStatus: conv.getCustomerLevelInfo().status,
      }));
    } catch (error) {
      console.error('[ConversationApplicationService] getConversationList error:', error);
      throw error;
    }
  }
}
