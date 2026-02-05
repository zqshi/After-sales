import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncKnowledgeItemUseCase } from '@application/use-cases/knowledge/SyncKnowledgeItemUseCase';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';

const makeItem = (metadata?: Record<string, unknown>, tags?: string[]) =>
  KnowledgeItem.create({
    title: '文档',
    content: '内容',
    category: KnowledgeCategory.create('guide'),
    tags: tags ?? ['上传文档'],
    source: 'upload',
    metadata,
  });

describe('SyncKnowledgeItemUseCase', () => {
  const knowledgeRepository = {
    findById: vi.fn(),
    save: vi.fn(),
  };
  const taxkbRepository = {
    findById: vi.fn(),
  };
  const taxkbAdapter = {
    isEnabled: vi.fn(),
  };
  const eventBus = {
    publishAll: vi.fn(),
  };
  const faqMiningService = {
    generateForItem: vi.fn(),
  };
  const knowledgeAiService = {
    isEnabled: vi.fn(),
    generateSummary: vi.fn(),
    generateTags: vi.fn(),
  };

  beforeEach(() => {
    knowledgeRepository.findById.mockReset();
    knowledgeRepository.save.mockReset();
    taxkbRepository.findById.mockReset();
    taxkbAdapter.isEnabled.mockReset();
    eventBus.publishAll.mockReset();
    faqMiningService.generateForItem.mockReset();
    knowledgeAiService.isEnabled.mockReset();
    knowledgeAiService.generateSummary.mockReset();
    knowledgeAiService.generateTags.mockReset();
  });

  it('returns existing item when TaxKB disabled', async () => {
    const item = makeItem({});
    knowledgeRepository.findById.mockResolvedValue(item);
    taxkbAdapter.isEnabled.mockReturnValue(false);

    const useCase = new SyncKnowledgeItemUseCase(
      knowledgeRepository as any,
      taxkbRepository as any,
      taxkbAdapter as any,
      eventBus as any,
      faqMiningService as any,
      knowledgeAiService as any,
    );

    const result = await useCase.execute({ knowledgeId: item.id });
    expect(result.id).toBe(item.id);
  });

  it('syncs content and applies ai summary and tags', async () => {
    const item = makeItem({ uploadDocId: 'doc-1', summary: '文档上传处理中' }, ['上传文档']);
    const taxkbItem = makeItem({ status: 'active' }, ['税务']);
    taxkbItem.update({ content: '同步内容', tags: ['税务', '流程'] });

    knowledgeRepository.findById.mockResolvedValue(item);
    taxkbAdapter.isEnabled.mockReturnValue(true);
    taxkbRepository.findById.mockResolvedValue(taxkbItem);
    knowledgeAiService.isEnabled.mockReturnValue(true);
    knowledgeAiService.generateSummary.mockResolvedValue('摘要');
    knowledgeAiService.generateTags.mockResolvedValue(['AI标签']);
    faqMiningService.generateForItem.mockResolvedValue(item);

    const useCase = new SyncKnowledgeItemUseCase(
      knowledgeRepository as any,
      taxkbRepository as any,
      taxkbAdapter as any,
      eventBus as any,
      faqMiningService as any,
      knowledgeAiService as any,
    );

    const result = await useCase.execute({ knowledgeId: item.id, uploadDocId: 'doc-1' });
    expect(result.id).toBe(item.id);
    expect(knowledgeRepository.save).toHaveBeenCalledTimes(1);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    expect(faqMiningService.generateForItem).toHaveBeenCalledTimes(1);
  });

  it('returns item when uploadDocId missing', async () => {
    const item = makeItem({});
    knowledgeRepository.findById.mockResolvedValue(item);
    taxkbAdapter.isEnabled.mockReturnValue(true);

    const useCase = new SyncKnowledgeItemUseCase(
      knowledgeRepository as any,
      taxkbRepository as any,
      taxkbAdapter as any,
      eventBus as any,
      faqMiningService as any,
      knowledgeAiService as any,
    );

    const result = await useCase.execute({ knowledgeId: item.id });
    expect(result.id).toBe(item.id);
    expect(knowledgeRepository.save).not.toHaveBeenCalled();
  });

  it('returns item when taxkb content missing', async () => {
    const item = makeItem({ uploadDocId: 'doc-1' });
    knowledgeRepository.findById.mockResolvedValue(item);
    taxkbAdapter.isEnabled.mockReturnValue(true);
    taxkbRepository.findById.mockResolvedValue({ id: 'doc-1', content: '' });

    const useCase = new SyncKnowledgeItemUseCase(
      knowledgeRepository as any,
      taxkbRepository as any,
      taxkbAdapter as any,
      eventBus as any,
      faqMiningService as any,
      knowledgeAiService as any,
    );

    const result = await useCase.execute({ knowledgeId: item.id });
    expect(result.id).toBe(item.id);
  });

  it('skips ai tags when existing tags present', async () => {
    const item = makeItem({ uploadDocId: 'doc-1', summary: '已有摘要' }, ['tag1']);
    const taxkbItem = makeItem({ status: 'active' }, ['t']);
    taxkbItem.update({ content: '同步内容', tags: ['t'] });
    knowledgeRepository.findById.mockResolvedValue(item);
    taxkbAdapter.isEnabled.mockReturnValue(true);
    taxkbRepository.findById.mockResolvedValue(taxkbItem);
    knowledgeAiService.isEnabled.mockReturnValue(true);
    knowledgeAiService.generateSummary.mockResolvedValue('summary');
    faqMiningService.generateForItem.mockResolvedValue(item);

    const useCase = new SyncKnowledgeItemUseCase(
      knowledgeRepository as any,
      taxkbRepository as any,
      taxkbAdapter as any,
      eventBus as any,
      faqMiningService as any,
      knowledgeAiService as any,
    );

    const result = await useCase.execute({ knowledgeId: item.id, uploadDocId: 'doc-1' });
    expect(result.id).toBe(item.id);
    expect(knowledgeAiService.generateTags).not.toHaveBeenCalled();
  });
});
