import { getContainer } from '../../application/container/bootstrap.js';

export class KnowledgeController {
  constructor() {
    const container = getContainer();
    this.service = container.resolve('knowledgeApplicationService');
  }

  async list(query = {}) {
    return this.service.listKnowledge(query);
  }

  async detail(knowledgeId) {
    return this.service.getKnowledgeDetail(knowledgeId);
  }

  async recommend(context = {}) {
    return this.service.recommendKnowledge(context);
  }
}

export const knowledgeController = new KnowledgeController();
