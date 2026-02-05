/**
 * ReviewRepository - 审核仓储
 */
import { BaseRepository } from './BaseRepository.js';
import { ReviewRequest } from '../../domains/review/models/ReviewRequest.js';

export class ReviewRepository extends BaseRepository {
  constructor(apiClient) {
    super('review', { apiClient, endpoint: '/api/reviews' });
  }

  async list(filters = {}) {
    const response = await this.getAll(filters);
    const items = response?.data?.items ?? response?.items ?? response?.data ?? [];
    return Array.isArray(items) ? items.map((item) => new ReviewRequest(item)) : [];
  }

  async findById(id) {
    const response = await this.getById(id);
    const payload = response?.data ?? response;
    return payload ? new ReviewRequest(payload) : null;
  }

  async create(payload) {
    const response = await this.post('', payload);
    const data = response?.data ?? response;
    return data ? new ReviewRequest(data) : null;
  }

  async complete(id, payload) {
    const response = await this.post(`/${id}/complete`, payload);
    const data = response?.data ?? response;
    return data ? new ReviewRequest(data) : null;
  }
}
