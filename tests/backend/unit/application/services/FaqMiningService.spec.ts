import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FaqMiningService } from '@application/services/FaqMiningService';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';

const makeItem = (metadata?: Record<string, unknown>, content?: string) =>
  KnowledgeItem.create({
    title: '测试文档',
    content: content ?? '段落一内容。\n\n- 要点1\n- 要点2\n\n段落二内容。',
    category: KnowledgeCategory.create('guide'),
    tags: ['上传文档'],
    source: 'upload',
    metadata,
  });

describe('FaqMiningService', () => {
  const repository = {
    findByFilters: vi.fn(),
    save: vi.fn(),
  };
  const eventBus = {
    publishAll: vi.fn(),
  };

  beforeEach(() => {
    repository.findByFilters.mockReset();
    repository.save.mockReset();
    eventBus.publishAll.mockReset();
  });

  it('skips when mining is disabled', async () => {
    const service = new FaqMiningService(repository as any, eventBus as any);
    const item = makeItem({ faqMining: { enabled: false } });
    const result = await service.generateForItem(item);
    expect(result).toBe(item);
    expect(repository.findByFilters).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('marks completed when faq already exists for document', async () => {
    const service = new FaqMiningService(repository as any, eventBus as any);
    const item = makeItem({ faqMining: { enabled: true, count: 3 } });
    repository.findByFilters.mockResolvedValue([
      KnowledgeItem.create({
        title: 'FAQ 1',
        content: '答案',
        category: KnowledgeCategory.create('faq'),
        tags: ['FAQ'],
        source: 'faq-mining',
        metadata: { sourceDocIds: [item.id] },
      }),
    ]);

    const result = await service.generateForItem(item);
    expect(result.metadata?.faqMining).toMatchObject({ status: 'completed', generatedCount: 1 });
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('skips when mining already completed', async () => {
    const service = new FaqMiningService(repository as any, eventBus as any);
    const item = makeItem({ faqMining: { enabled: true, status: 'completed' } });
    const result = await service.generateForItem(item);
    expect(result).toBe(item);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('generates new faq items via rule-based drafts', async () => {
    const service = new FaqMiningService(repository as any, eventBus as any, {
      isEnabled: () => false,
      generateFaqs: vi.fn(),
    } as any);
    const item = makeItem({ faqMining: { enabled: true, count: 2 } });
    repository.findByFilters.mockResolvedValue([]);

    const result = await service.generateForItem(item);

    expect(repository.save).toHaveBeenCalled();
    expect(eventBus.publishAll).toHaveBeenCalled();
    expect(result.metadata?.faqMining).toMatchObject({ status: 'completed' });
  });

  it('uses ai drafts when enabled', async () => {
    const service = new FaqMiningService(repository as any, eventBus as any, {
      isEnabled: () => true,
      generateFaqs: vi.fn().mockResolvedValue([{ question: 'Q1', answer: 'A1' }]),
    } as any);
    const item = makeItem({ faqMining: { enabled: true, count: 1 } });
    repository.findByFilters.mockResolvedValue([]);

    const result = await service.generateForItem(item);

    expect(result.metadata?.faqMining).toMatchObject({ generatedCount: 1 });
  });

  it('skips duplicate questions', async () => {
    const service = new FaqMiningService(repository as any, eventBus as any);
    const item = makeItem({ faqMining: { enabled: true, count: 1 } });
    repository.findByFilters.mockResolvedValue([
      KnowledgeItem.create({
        title: '《测试文档》主要讲了什么？',
        content: '答案',
        category: KnowledgeCategory.create('faq'),
        tags: ['FAQ'],
        source: 'faq-mining',
      }),
    ]);

    const result = await service.generateForItem(item);

    expect(result.metadata?.faqMining).toMatchObject({ generatedCount: 0 });
  });
});
