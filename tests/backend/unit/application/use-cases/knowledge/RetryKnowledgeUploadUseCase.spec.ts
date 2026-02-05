import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RetryKnowledgeUploadUseCase } from '@application/use-cases/knowledge/RetryKnowledgeUploadUseCase';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';

const makeItem = (metadata?: Record<string, unknown>) =>
  KnowledgeItem.create({
    title: '文档',
    content: '内容',
    category: KnowledgeCategory.create('guide'),
    tags: [],
    source: 'upload',
    metadata,
  });

describe('RetryKnowledgeUploadUseCase', () => {
  const knowledgeRepository = {
    findById: vi.fn(),
    save: vi.fn(),
  };
  const taxkbRepository = {
    findById: vi.fn(),
    findByFileHash: vi.fn(),
  };
  const taxkbAdapter = {
    isEnabled: vi.fn(),
  };
  const eventBus = {
    publishAll: vi.fn(),
  };

  beforeEach(() => {
    knowledgeRepository.findById.mockReset();
    knowledgeRepository.save.mockReset();
    taxkbRepository.findById.mockReset();
    taxkbRepository.findByFileHash.mockReset();
    taxkbAdapter.isEnabled.mockReset();
    eventBus.publishAll.mockReset();
  });

  it('throws when knowledgeId missing', async () => {
    const useCase = new RetryKnowledgeUploadUseCase(
      knowledgeRepository as any,
      taxkbRepository as any,
      taxkbAdapter as any,
      eventBus as any,
    );
    await expect(useCase.execute({ knowledgeId: '' })).rejects.toThrow('knowledgeId is required');
  });

  it('returns existing item when TaxKB disabled', async () => {
    const item = makeItem({});
    knowledgeRepository.findById.mockResolvedValue(item);
    taxkbAdapter.isEnabled.mockReturnValue(false);

    const useCase = new RetryKnowledgeUploadUseCase(
      knowledgeRepository as any,
      taxkbRepository as any,
      taxkbAdapter as any,
      eventBus as any,
    );
    const result = await useCase.execute({ knowledgeId: item.id });
    expect(result.id).toBe(item.id);
  });

  it('updates metadata when taxkb lookup fails', async () => {
    const item = makeItem({ uploadDocId: 'doc-1', fileName: 'file', fileHash: 'hash' });
    knowledgeRepository.findById.mockResolvedValue(item);
    taxkbAdapter.isEnabled.mockReturnValue(true);
    taxkbRepository.findById.mockRejectedValue(new Error('fail'));

    const useCase = new RetryKnowledgeUploadUseCase(
      knowledgeRepository as any,
      taxkbRepository as any,
      taxkbAdapter as any,
      eventBus as any,
    );
    const result = await useCase.execute({ knowledgeId: item.id });
    expect(result.metadata?.status).toBe('retry');
    expect(knowledgeRepository.save).toHaveBeenCalledTimes(1);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('returns item when taxkb item not found', async () => {
    const item = makeItem({ fileName: 'file', fileHash: 'hash' });
    knowledgeRepository.findById.mockResolvedValue(item);
    taxkbAdapter.isEnabled.mockReturnValue(true);
    taxkbRepository.findByFileHash.mockResolvedValue(null);

    const useCase = new RetryKnowledgeUploadUseCase(
      knowledgeRepository as any,
      taxkbRepository as any,
      taxkbAdapter as any,
      eventBus as any,
    );

    const result = await useCase.execute({ knowledgeId: item.id });
    expect(result.id).toBe(item.id);
    expect(knowledgeRepository.save).not.toHaveBeenCalled();
  });

  it('updates metadata when taxkb item found', async () => {
    const item = makeItem({ fileName: 'file', fileHash: 'hash' });
    knowledgeRepository.findById.mockResolvedValue(item);
    taxkbAdapter.isEnabled.mockReturnValue(true);
    taxkbRepository.findByFileHash.mockResolvedValue({ id: 'doc-1', metadata: { status: 'active' } });

    const useCase = new RetryKnowledgeUploadUseCase(
      knowledgeRepository as any,
      taxkbRepository as any,
      taxkbAdapter as any,
      eventBus as any,
    );

    const result = await useCase.execute({ knowledgeId: item.id });
    expect(result.metadata?.status).toBe('active');
    expect(knowledgeRepository.save).toHaveBeenCalledTimes(1);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });
});
