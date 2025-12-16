/**
 * ConversationController - 对话控制器
 *
 * 表现层控制器的职责：
 * 1. 处理用户输入
 * 2. 调用应用服务
 * 3. 更新UI
 */

import { getContainer } from '../../application/container/bootstrap.js';
import { SendMessageCommand } from '../../application/conversation/commands/SendMessageCommand.js';
import { CloseConversationCommand } from '../../application/conversation/commands/CloseConversationCommand.js';
import { AssignAgentCommand } from '../../application/conversation/commands/AssignAgentCommand.js';
import { GetConversationQuery } from '../../application/conversation/queries/GetConversationQuery.js';

export class ConversationController {
  constructor() {
    const container = getContainer();
    this.conversationService = container.resolve('conversationApplicationService');
  }

  /**
   * 发送消息
   * @param {Object} data - 消息数据
   * @returns {Promise<Object>} 发送结果
   */
  async sendMessage(data) {
    try {
      // 1. 构建命令
      const command = new SendMessageCommand({
        conversationId: data.conversationId,
        senderId: data.senderId,
        senderType: data.senderType,
        content: data.content,
      });

      // 2. 调用应用服务
      const result = await this.conversationService.sendMessage(command);

      // 3. 返回结果（UI更新由事件处理器完成）
      return result;
    } catch (error) {
      console.error('[ConversationController] sendMessage error:', error);
      throw error;
    }
  }

  /**
   * 关闭对话
   * @param {Object} data - 关闭数据
   * @returns {Promise<Object>} 关闭结果
   */
  async closeConversation(data) {
    try {
      const command = new CloseConversationCommand({
        conversationId: data.conversationId,
        closedBy: data.closedBy,
        reason: data.reason,
      });

      const result = await this.conversationService.closeConversation(command);
      return result;
    } catch (error) {
      console.error('[ConversationController] closeConversation error:', error);
      throw error;
    }
  }

  /**
   * 分配客服
   * @param {Object} data - 分配数据
   * @returns {Promise<Object>} 分配结果
   */
  async assignAgent(data) {
    try {
      const command = new AssignAgentCommand({
        conversationId: data.conversationId,
        agentId: data.agentId,
        agentName: data.agentName,
      });

      const result = await this.conversationService.assignAgent(command);
      return result;
    } catch (error) {
      console.error('[ConversationController] assignAgent error:', error);
      throw error;
    }
  }

  /**
   * 获取对话详情
   * @param {Object} data - 查询数据
   * @returns {Promise<Object>} 对话详情
   */
  async getConversation(data) {
    try {
      const query = new GetConversationQuery({
        conversationId: data.conversationId,
        includeMessages: data.includeMessages,
      });

      const result = await this.conversationService.getConversation(query);
      return result;
    } catch (error) {
      console.error('[ConversationController] getConversation error:', error);
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
      const result = await this.conversationService.getConversationList(filters);
      return result;
    } catch (error) {
      console.error('[ConversationController] getConversationList error:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const conversationController = new ConversationController();
