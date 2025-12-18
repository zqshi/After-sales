/**
 * KnowledgeRepository - 知识仓储
 */
import { BaseRepository } from './BaseRepository.js';
import { fetchKnowledge, fetchKnowledgeFull } from '../../api.js';
import { KnowledgeItem } from '../../domains/knowledge/models/KnowledgeItem.js';

export class KnowledgeRepository extends BaseRepository {
  constructor(apiClient = null) {
    super('knowledge', { apiClient });
  }

  async list(filters = {}) {
    try {
      const response = await fetchKnowledge(filters);
      const items = response?.items ?? response?.data ?? [];
      return items.map(item => new KnowledgeItem(item));
    } catch (error) {
      console.warn('[KnowledgeRepository] failed to list knowledge items', error);
      return [];
    }
  }

  async findById(id) {
    try {
      const response = await fetchKnowledgeFull(id);
      const payload = response?.data ?? response;
      if (!payload) {
        return null;
      }
      return new KnowledgeItem(payload);
    } catch (error) {
      console.warn('[KnowledgeRepository] failed to fetch knowledge detail', error);
      return null;
    }
  }
}
