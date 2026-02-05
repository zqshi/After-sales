import { describe, expect, it, vi } from 'vitest';
import { TaxKBKnowledgeRepository } from '@infrastructure/repositories/TaxKBKnowledgeRepository';
import { TaxKBError } from '@infrastructure/adapters/TaxKBAdapter';

describe('TaxKBKnowledgeRepository', () => {
  it('returns null when document not found', async () => {
    const adapter = {
      getDocument: vi.fn().mockRejectedValue(new TaxKBError('not found', 404)),
    };
    const repo = new TaxKBKnowledgeRepository(adapter as any);
    const result = await repo.findById('missing');
    expect(result).toBeNull();
  });

  it('filters results by category and tags', async () => {
    const adapter = {
      searchDocuments: vi.fn().mockResolvedValue([{ doc_id: '1' }, { doc_id: '2' }]),
      getDocument: vi
        .fn()
        .mockResolvedValueOnce({
          doc_id: '1',
          title: 'A',
          content: 'C1',
          status: 'active',
          tags: { dim: [{ tag_id: 't1', name: 'TagA' }] },
          category: { business_domain: '常见问题', company_entity: 'system' },
        })
        .mockResolvedValueOnce({
          doc_id: '2',
          title: 'B',
          content: 'C2',
          status: 'active',
          tags: { dim: [{ tag_id: 't2', name: 'TagB' }] },
          category: { business_domain: '系统问题/功能故障', company_entity: 'system' },
        }),
    };

    const repo = new TaxKBKnowledgeRepository(adapter as any);
    const items = await repo.findByFilters({ category: 'faq', tags: ['TagA'] }, { limit: 10, offset: 0 });
    expect(items.length).toBe(1);
    expect(items[0].id).toBe('1');
  });

  it('returns null for empty file hash lookup', async () => {
    const adapter = { searchDocuments: vi.fn(), getDocument: vi.fn() };
    const repo = new TaxKBKnowledgeRepository(adapter as any);
    const result = await repo.findByFileHash('', '');
    expect(result).toBeNull();
  });
});
