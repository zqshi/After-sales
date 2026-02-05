import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateKnowledgeItemUseCase } from '@application/use-cases/knowledge/CreateKnowledgeItemUseCase';

const knowledgeRepository = {
  save: vi.fn(),
};
const eventBus = {
  publishAll: vi.fn(),
};

describe('CreateKnowledgeItemUseCase', () => {
  beforeEach(() => {
    knowledgeRepository.save.mockReset();
    eventBus.publishAll.mockReset();
  });

  it('throws when title missing', async () => {
    const useCase = new CreateKnowledgeItemUseCase(knowledgeRepository as any, eventBus as any);
    await expect(
      useCase.execute({ title: '', content: 'c', category: 'faq', source: 'manual' } as any),
    ).rejects.toThrow('title is required');
  });

  it('throws when content missing', async () => {
    const useCase = new CreateKnowledgeItemUseCase(knowledgeRepository as any, eventBus as any);
    await expect(
      useCase.execute({ title: 't', content: '', category: 'faq', source: 'manual' } as any),
    ).rejects.toThrow('content is required');
  });

  it('throws when category missing', async () => {
    const useCase = new CreateKnowledgeItemUseCase(knowledgeRepository as any, eventBus as any);
    await expect(
      useCase.execute({ title: 't', content: 'c', category: '', source: 'manual' } as any),
    ).rejects.toThrow('category is required');
  });

  it('creates knowledge item and emits events', async () => {
    const useCase = new CreateKnowledgeItemUseCase(knowledgeRepository as any, eventBus as any);

    const result = await useCase.execute({
      title: 'Title',
      content: 'Content',
      category: 'faq',
      source: 'manual',
      tags: ['t1'],
    } as any);

    expect(result.title).toBe('Title');
    expect(knowledgeRepository.save).toHaveBeenCalledTimes(1);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });
});
