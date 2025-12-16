/**
 * ConversationRepository - 对话仓储
 *
 * 负责对话数据的持久化和获取
 */

import { BaseRepository } from './BaseRepository.js';

export class ConversationRepository extends BaseRepository {
  constructor(apiClient) {
    super(apiClient, '/conversations');
  }

  /**
   * 获取对话列表
   * @param {Object} params - 查询参数
   * @returns {Promise<Array>}
   */
  async list(params = {}) {
    return this.getAll(params);
  }

  /**
   * 获取单个对话详情
   * @param {string} id - 对话ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   */
  async findById(id, options = {}) {
    return this.getById(id, options);
  }

  /**
   * 创建新对话
   * @param {Object} data - 对话数据
   * @returns {Promise<Object>}
   */
  async create(data) {
    return this.post('', data);
  }

  /**
   * 发送消息
   * @param {string} conversationId - 对话ID
   * @param {Object} message - 消息数据
   * @returns {Promise<Object>}
   */
  async sendMessage(conversationId, message) {
    return this.post(`/${conversationId}/messages`, message);
  }

  /**
   * 关闭对话
   * @param {string} conversationId - 对话ID
   * @param {Object} data - 关闭数据
   * @returns {Promise<Object>}
   */
  async close(conversationId, data) {
    return this.post(`/${conversationId}/close`, data);
  }

  /**
   * 更新对话
   * @param {string} id - 对话ID
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    return this.put(`/${id}`, data);
  }
}
