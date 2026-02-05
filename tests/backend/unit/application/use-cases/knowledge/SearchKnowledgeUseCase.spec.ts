import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchKnowledgeUseCase } from '@application/use-cases/knowledge/SearchKnowledgeUseCase';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';

const makeItem = (id: string) => {
  const item = KnowledgeItem.create({
    title: `Title ${id}`,
    content: 'Content',
    category: KnowledgeCategory.create('faq'),
    source: 'manual',
  });
  (item as any)._id = id;
  return item;
};

describe('SearchKnowledgeUseCase', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('returns cached results', async () => {
    const taxkbRepo = { findByFilters: vi.fn().mockResolvedValue([makeItem('k1')]) };
    const useCase = new SearchKnowledgeUseCase(taxkbRepo as any);

    const first = await useCase.execute({ query: 'test' });
    const second = await useCase.execute({ query: 'test' });

    expect(first.length).toBe(1);
    expect(second.length).toBe(1);
    expect(taxkbRepo.findByFilters).toHaveBeenCalledTimes(1);
  });

  it('handles semantic search with TaxKB enabled', async () => {
    const taxkbRepo = { semanticSearch: vi.fn().mockResolvedValue([makeItem('k1')]) };
    const adapter = { isEnabled: vi.fn().mockReturnValue(true) };
    const useCase = new SearchKnowledgeUseCase(taxkbRepo as any, undefined, adapter as any);

    const result = await useCase.execute({ query: 'q', mode: 'semantic', filters: { topK: 2 } });

    expect(taxkbRepo.semanticSearch).toHaveBeenCalledWith('q', { topK: 2, docIds: undefined });
    expect(result.length).toBe(1);
  });

  it('falls back to local for semantic when TaxKB disabled', async () => {
    const taxkbRepo = { semanticSearch: vi.fn() };
    const knowledgeRepo = { findByFilters: vi.fn().mockResolvedValue([makeItem('k2')]) };
    const adapter = { isEnabled: vi.fn().mockReturnValue(false) };
    const useCase = new SearchKnowledgeUseCase(taxkbRepo as any, knowledgeRepo as any, adapter as any);

    const result = await useCase.execute({ query: 'q', mode: 'semantic', filters: { limit: 1 } });

    expect(taxkbRepo.semanticSearch).not.toHaveBeenCalled();
    expect(result.length).toBe(1);
  });

  it('returns empty for QA when TaxKB disabled', async () => {
    const taxkbRepo = { searchQA: vi.fn() };
    const adapter = { isEnabled: vi.fn().mockReturnValue(false) };
    const useCase = new SearchKnowledgeUseCase(taxkbRepo as any, undefined, adapter as any);

    const result = await useCase.execute({ query: 'q', mode: 'qa' });

    expect(result).toEqual([]);
  });

  it('searches QA with TaxKB enabled', async () => {
    const taxkbRepo = { searchQA: vi.fn().mockResolvedValue([{ doc_id: 'd1' }]) };
    const adapter = { isEnabled: vi.fn().mockReturnValue(true) };
    const useCase = new SearchKnowledgeUseCase(taxkbRepo as any, undefined, adapter as any);

    const result = await useCase.execute({ query: 'q', mode: 'qa', filters: { topK: 3 } });

    expect(taxkbRepo.searchQA).toHaveBeenCalledWith('q', { topK: 3, docIds: undefined });
    expect(result.length).toBe(1);
  });

  it('falls back to local when TaxKB search fails', async () => {
    vi.useFakeTimers();
    const taxkbRepo = { findByFilters: vi.fn().mockRejectedValue(new Error('boom')) };
    const knowledgeRepo = { findByFilters: vi.fn().mockResolvedValue([makeItem('k3')]) };
    const adapter = { isEnabled: vi.fn().mockReturnValue(true) };
    const useCase = new SearchKnowledgeUseCase(taxkbRepo as any, knowledgeRepo as any, adapter as any);

    const promise = useCase.execute({ query: 'q', filters: { limit: 1 } });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.length).toBe(1);
    expect(knowledgeRepo.findByFilters).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('retries taxkb calls before success', async () => {
    vi.useFakeTimers();
    const taxkbRepo = {
      findByFilters: vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValueOnce([makeItem('k4')]),
    };
    const adapter = { isEnabled: vi.fn().mockReturnValue(true) };
    const useCase = new SearchKnowledgeUseCase(taxkbRepo as any, undefined, adapter as any);

    const promise = useCase.execute({ query: 'q' });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.length).toBe(1);
    expect(taxkbRepo.findByFilters).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
