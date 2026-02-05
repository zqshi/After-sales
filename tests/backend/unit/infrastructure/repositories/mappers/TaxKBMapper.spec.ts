import { describe, expect, it } from 'vitest';
import { TaxKBMapper } from '@infrastructure/repositories/mappers/TaxKBMapper';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';

describe('TaxKBMapper', () => {
  it('maps taxkb document to knowledge item with tags and sanitized content', () => {
    const item = TaxKBMapper.toKnowledgeItem({
      doc_id: 'doc-1',
      title: '标题',
      content: '--- Page 1 ---\n- 项目A\n- 项目B\n\n段落一\n2\n段落二',
      status: 'archived',
      tags: {
        dimension: [
          { tag_id: 't1', name: '标签1' },
          { tag_id: 't2', name: '标签2' },
        ],
      },
      category: { business_domain: '常见问题', company_entity: 'ACME' },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      file_hash: 'hash',
      page_count: 2,
      quality_score: 0.8,
    } as any);

    expect(item.id).toBe('doc-1');
    expect(item.category.value).toBe('faq');
    expect(item.tags).toEqual(['标签1', '标签2']);
    expect(item.content).toContain('- 项目A');
    expect(item.isArchived).toBe(true);
  });

  it('maps knowledge item to taxkb document payload', () => {
    const item = TaxKBMapper.toKnowledgeItem({
      doc_id: 'doc-2',
      title: '标题',
      content: '内容',
      status: 'active',
      tags: {},
      category: { business_domain: '系统问题/功能故障', company_entity: 'system' },
    } as any);

    const payload = TaxKBMapper.toTaxKBDocument(item);
    expect(payload.category?.business_domain).toBe('系统问题/功能故障');
    expect(payload.category?.company_entity).toBe('system');
  });

  it('falls back to other category when unknown', () => {
    const item = TaxKBMapper.toKnowledgeItem({
      doc_id: 'doc-3',
      title: '标题',
      content: '内容',
      status: 'active',
      tags: {},
      category: { business_domain: '未知分类', company_entity: 'system' },
    } as any);

    expect(item.category.value).toBe(KnowledgeCategory.create('other').value);
  });
});
