/**
 * ProblemRepository - 问题仓储
 */
import { BaseRepository } from './BaseRepository.js';
import { Problem } from '../../domains/problem/models/Problem.js';

export class ProblemRepository extends BaseRepository {
  constructor(apiClient) {
    super('problem', { apiClient, endpoint: '/api/problems' });
  }

  async list(filters = {}) {
    const response = await this.getAll(filters);
    const items = response?.data?.items ?? response?.items ?? response?.data ?? [];
    return Array.isArray(items) ? items.map((item) => new Problem(item)) : [];
  }

  async findById(id) {
    const response = await this.getById(id);
    const payload = response?.data ?? response;
    return payload ? new Problem(payload) : null;
  }

  async create(payload) {
    const response = await this.post('', payload);
    const data = response?.data ?? response;
    return data ? new Problem(data) : null;
  }

  async updateStatus(id, status, reason) {
    const response = await this.patch(`/${id}/status`, { status, reason });
    const data = response?.data ?? response;
    return data ? new Problem(data) : null;
  }
}
