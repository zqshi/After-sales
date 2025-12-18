/**
 * KnowledgeApplicationService - 知识应用服务
 */
import { KnowledgeRecommender } from '../../domains/knowledge/services/KnowledgeRecommender.js';

export class KnowledgeApplicationService {
  constructor({ knowledgeRepository, eventBus }) {
    this.knowledgeRepository = knowledgeRepository;
    this.eventBus = eventBus;
    this.recommender = new KnowledgeRecommender();
  }

  async listKnowledge(query = {}) {
    const items = await this.knowledgeRepository.list(query);
    return {
      total: items.length,
      items: items.map(item => item.toCardDTO()),
    };
  }

  async getKnowledgeDetail(knowledgeId) {
    if (!knowledgeId) {
      return null;
    }
    const item = await this.knowledgeRepository.findById(knowledgeId);
    return item ? item.toDetailDTO() : null;
  }

  async recommendKnowledge(context = {}) {
    const items = await this.knowledgeRepository.list(context.filters || {});
    const recommended = this.recommender.recommend(items, {
      tags: context.tags,
      type: context.type,
      limit: context.limit,
    });
    return recommended.map(item => item.toCardDTO());
  }
}
