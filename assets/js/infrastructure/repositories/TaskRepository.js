/**
 * TaskRepository - 任务仓储
 *
 * 负责任务的持久化与查询
 */

import { BaseRepository } from './BaseRepository.js';

export class TaskRepository extends BaseRepository {
  constructor(apiClient) {
    super('task', { apiClient, cacheEnabled: false });
    this.endpoint = '/tasks';
  }

  async list(filters = {}) {
    return this.apiClient.get(this.endpoint, { params: filters });
  }

  async findById(taskId) {
    return this.apiClient.get(`${this.endpoint}/${taskId}`);
  }

  async create(payload) {
    return this.apiClient.post(this.endpoint, payload);
  }

  async assign(taskId, data) {
    return this.apiClient.post(`${this.endpoint}/${taskId}/assign`, data);
  }

  async updateStatus(taskId, data) {
    return this.apiClient.patch(`${this.endpoint}/${taskId}/status`, data);
  }

  async complete(taskId, data = {}) {
    return this.apiClient.post(`${this.endpoint}/${taskId}/complete`, data);
  }
}
