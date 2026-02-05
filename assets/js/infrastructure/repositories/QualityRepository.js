/**
 * QualityRepository - 质检仓储
 */
import { BaseRepository } from './BaseRepository.js';
import { QualityReport } from '../../domains/quality/models/QualityReport.js';

export class QualityRepository extends BaseRepository {
  constructor(apiClient) {
    super('quality', { apiClient, endpoint: '/api/quality' });
  }

  async getLatestByConversation(conversationId) {
    const response = await this.apiClient.get(`${this.endpoint}/${conversationId}`);
    const payload = response?.data ?? response;
    return payload ? new QualityReport(payload) : null;
  }

  async listByConversation(conversationId, filters = {}) {
    const response = await this.apiClient.get(`${this.endpoint}/${conversationId}/reports`, { params: filters });
    const items = response?.data?.items ?? response?.items ?? response?.data ?? [];
    return Array.isArray(items) ? items.map((item) => new QualityReport(item)) : [];
  }

  async listLatest(filters = {}) {
    const response = await this.apiClient.get(`${this.endpoint}/reports`, { params: filters });
    const items = response?.data?.items ?? response?.items ?? response?.data ?? [];
    return Array.isArray(items) ? items.map((item) => new QualityReport(item)) : [];
  }
}
