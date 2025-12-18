/**
 * RequirementRepository - 需求仓储
 *
 * 负责需求数据的持久化和获取
 */

import { BaseRepository } from './BaseRepository.js';

export class RequirementRepository extends BaseRepository {
  constructor(apiClient) {
    super(apiClient, '/requirements');
  }

  /**
   * 获取需求列表
   * @param {Object} params - 查询参数
   * @returns {Promise<Array>}
   */
  async list(params = {}) {
    return this.getAll(params);
  }

  /**
   * 获取单个需求详情
   * @param {string} id - 需求ID
   * @returns {Promise<Object>}
   */
  async findById(id) {
    return this.getById(id);
  }

  /**
   * 创建新需求
   * @param {Object} data - 需求数据
   * @returns {Promise<Object>}
   */
  async create(data) {
    return this.post('', data);
  }

  /**
   * 更新需求
   * @param {string} id - 需求ID
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    return this.put(`/${id}`, data);
  }

  /**
   * 删除需求
   * @param {string} id - 需求ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    return this.del(`/${id}`);
  }

  /**
   * 更新需求状态
   * @param {string} id - 需求ID
   * @param {string} status - 新状态
   * @returns {Promise<Object>}
   */
  async updateStatus(id, status) {
    return this.patch(`/${id}`, { status });
  }

  /**
   * 保存需求（接口契约）
   * @param {Requirement} requirement
   * @returns {Promise<Requirement>}
   */
  async save(requirement) {
    return requirement;
  }
}
