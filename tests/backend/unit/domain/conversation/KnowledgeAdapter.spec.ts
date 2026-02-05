import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeAdapter } from '@domain/conversation/anti-corruption/KnowledgeAdapter';

const makeItem = (overrides: Record<string, any> = {}) => ({
  id: 'k1',
  title: '登录问题',
  content: '登录失败 请重置密码',
  category: { value: 'faq' },
  source: 'kb',
  ...overrides,
});

describe('KnowledgeAdapter', () => {
  let repository: any;
  let adapter: KnowledgeAdapter;

  beforeEach(() => {
    repository = {
      findByFilters: vi.fn(),
      findById: vi.fn(),
    };
    adapter = new KnowledgeAdapter(repository);
  });

  it('searches knowledge and calculates relevance', async () => {
    repository.findByFilters.mockResolvedValue([
      makeItem({ content: '登录 失败' }),
      makeItem({ id: 'k2', content: '退款 指南' }),
    ]);

    const results = await adapter.searchKnowledge({ query: '登录 失败' });
    expect(results.length).toBe(2);
    expect(results[0].relevanceScore).toBeGreaterThan(0);
  });

  it('gets knowledge by category', async () => {
    repository.findByFilters.mockResolvedValue([makeItem()]);
    const results = await adapter.getKnowledgeByCategory('faq', 2);
    expect(results.length).toBe(1);
    expect(results[0].category).toBe('faq');
  });

  it('gets knowledge by tags', async () => {
    repository.findByFilters.mockResolvedValue([makeItem({ id: 'k3' })]);
    const results = await adapter.getKnowledgeByTags(['login']);
    expect(results[0].id).toBe('k3');
  });

  it('gets knowledge by id and ids', async () => {
    repository.findById.mockResolvedValueOnce(makeItem({ id: 'k4' }));
    const single = await adapter.getKnowledgeById('k4');
    expect(single?.id).toBe('k4');

    repository.findById
      .mockResolvedValueOnce(makeItem({ id: 'k4' }))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeItem({ id: 'k5' }));
    const list = await adapter.getKnowledgeByIds(['k4', 'missing', 'k5']);
    expect(list.length).toBe(2);
  });

  it('recommends knowledge by relevance', async () => {
    repository.findByFilters.mockResolvedValue([
      makeItem({ id: 'k6', content: '登录 失败 处理' }),
      makeItem({ id: 'k7', content: '退款 流程' }),
    ]);

    const results = await adapter.getRecommendedKnowledge('c1', '登录 失败', 1);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('k6');
  });
});
