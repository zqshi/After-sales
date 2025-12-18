import { describe, it, expect } from 'vitest';
import { KnowledgeRecommender } from '../KnowledgeRecommender.js';
import { KnowledgeItem } from '../../models/KnowledgeItem.js';

describe('KnowledgeRecommender', () => {
  it('prioritizes published knowledge with matching tags', () => {
    const items = [
      new KnowledgeItem({
        id: 'k-001',
        title: '报警处理指南',
        tags: ['alert', 'dispatch'],
        status: 'published',
        rating: { score: 4.6, votes: 12 },
      }),
      new KnowledgeItem({
        id: 'k-002',
        title: '体验反馈模版',
        tags: ['feedback'],
        status: 'draft',
        rating: { score: 5, votes: 2 },
      }),
    ];
    const recommender = new KnowledgeRecommender();
    const recommended = recommender.recommend(items, { tags: ['alert'], limit: 2 });
    expect(recommended[0].id).toBe('k-001');
    expect(recommended.length).toBe(2);
  });
});
