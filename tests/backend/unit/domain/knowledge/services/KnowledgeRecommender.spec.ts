import { describe, expect, it } from 'vitest';
import { KnowledgeRecommender } from '@domain/knowledge/services/KnowledgeRecommender';

describe('KnowledgeRecommender', () => {
  const recommender = new KnowledgeRecommender();
  const items = [
    { id: '1', title: 'Reset password', tags: ['auth'], category: 'faq' },
    { id: '2', title: 'Setup multi-region', tags: ['infra', 'deployment'], category: 'guide' },
    { id: '3', title: 'Security policy', tags: ['security'], category: 'policy' },
  ];

  it('scores items that match keywords', () => {
    const results = recommender.recommendByKeywords(items, ['reset']);
    expect(results).toHaveLength(1);
    expect(results[0].knowledgeId).toBe('1');
  });

  it('boosts FAQ entries slightly', () => {
    const results = recommender.recommendByKeywords(items, ['security']);
    expect(results[0].score).toBeGreaterThanOrEqual(0.5);
  });
});
