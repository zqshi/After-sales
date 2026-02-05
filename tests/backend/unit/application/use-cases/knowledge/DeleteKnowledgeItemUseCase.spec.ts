import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteKnowledgeItemUseCase } from '@application/use-cases/knowledge/DeleteKnowledgeItemUseCase';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';

const makeItem = (metadata?: Record<string, unknown>) =>
  KnowledgeItem.create({
    title: 'Doc',
    content: 'Content',
    category: KnowledgeCategory.create('faq'),
    source: 'manual',
    metadata,
  });

describe('DeleteKnowledgeItemUseCase', () => {
  const knowledgeRepository = {
    findById: vi.fn(),
    findByFilters: vi.fn(),
    delete: vi.fn(),
    save: vi.fn(),
  };
  const eventBus = {
    publishAll: vi.fn(),
  };

  beforeEach(() => {
    knowledgeRepository.findById.mockReset();
    knowledgeRepository.findByFilters.mockReset();
    knowledgeRepository.delete.mockReset();
    knowledgeRepository.save.mockReset();
    eventBus.publishAll.mockReset();
  });

  it('throws when knowledgeId missing', async () => {
    const useCase = new DeleteKnowledgeItemUseCase(
      knowledgeRepository as any,
      eventBus as any,
    );

    await expect(useCase.execute({ knowledgeId: '' })).rejects.toThrow('knowledgeId is required');
  });

  it('throws when item not found', async () => {
    knowledgeRepository.findById.mockResolvedValue(null);
    const useCase = new DeleteKnowledgeItemUseCase(
      knowledgeRepository as any,
      eventBus as any,
    );

    await expect(useCase.execute({ knowledgeId: 'k1' })).rejects.toThrow('Knowledge item not found: k1');
  });

  it('archives related FAQs when deleteRelatedFaq is true', async () => {
    const item = makeItem();
    const faq = makeItem({ sourceDocIds: [item.id] });
    knowledgeRepository.findById.mockResolvedValue(item);
    knowledgeRepository.findByFilters.mockResolvedValue([faq]);
    const useCase = new DeleteKnowledgeItemUseCase(
      knowledgeRepository as any,
      eventBus as any,
    );

    await useCase.execute({ knowledgeId: item.id, deleteRelatedFaq: true });

    expect(knowledgeRepository.delete).toHaveBeenCalledTimes(2);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(2);
  });

  it('marks related FAQs as deleted when deleteRelatedFaq is false', async () => {
    const item = makeItem();
    const faq = makeItem({ sourceDocIds: [item.id] });
    knowledgeRepository.findById.mockResolvedValue(item);
    knowledgeRepository.findByFilters.mockResolvedValue([faq]);
    const useCase = new DeleteKnowledgeItemUseCase(
      knowledgeRepository as any,
      eventBus as any,
    );

    await useCase.execute({ knowledgeId: item.id, deleteRelatedFaq: false });

    expect(knowledgeRepository.save).toHaveBeenCalledTimes(1);
    expect(knowledgeRepository.delete).toHaveBeenCalledTimes(1);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(2);
  });

  it('deletes item when no related FAQs', async () => {
    const item = makeItem();
    knowledgeRepository.findById.mockResolvedValue(item);
    knowledgeRepository.findByFilters.mockResolvedValue([]);
    const useCase = new DeleteKnowledgeItemUseCase(
      knowledgeRepository as any,
      eventBus as any,
    );

    await useCase.execute({ knowledgeId: item.id });

    expect(knowledgeRepository.delete).toHaveBeenCalledTimes(1);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });
});
