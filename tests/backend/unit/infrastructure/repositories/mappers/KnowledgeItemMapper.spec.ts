import { describe, expect, it } from 'vitest';
import { KnowledgeItemMapper } from '@infrastructure/repositories/mappers/KnowledgeItemMapper';
import { KnowledgeItemEntity } from '@infrastructure/database/entities/KnowledgeItemEntity';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';

const makeEntity = (): KnowledgeItemEntity => {
  const entity = new KnowledgeItemEntity();
  entity.id = 'k1';
  entity.title = 'Title';
  entity.content = 'Content';
  entity.category = 'faq';
  entity.tags = ['t1'];
  entity.source = 'manual';
  entity.metadata = { foo: 'bar' } as any;
  entity.isArchived = false;
  entity.createdAt = new Date('2026-01-01T00:00:00Z');
  entity.updatedAt = new Date('2026-01-02T00:00:00Z');
  return entity;
};

describe('KnowledgeItemMapper', () => {
  it('maps entity to domain', () => {
    const entity = makeEntity();
    const item = KnowledgeItemMapper.toDomain(entity);

    expect(item.id).toBe('k1');
    expect(item.category.value).toBe('faq');
    expect(item.tags).toEqual(['t1']);
    expect(item.metadata?.foo).toBe('bar');
  });

  it('maps entity with empty tags and metadata', () => {
    const entity = makeEntity();
    entity.tags = undefined as any;
    entity.metadata = undefined as any;
    const item = KnowledgeItemMapper.toDomain(entity);
    expect(item.tags).toEqual([]);
    expect(item.metadata).toEqual({});
  });

  it('maps domain to entity', () => {
    const item = KnowledgeItem.create({
      title: 'Doc',
      content: 'Body',
      category: KnowledgeCategory.create('guide'),
      source: 'manual',
      tags: ['x'],
      metadata: { a: 1 },
    });
    const entity = KnowledgeItemMapper.toEntity(item);

    expect(entity.id).toBe(item.id);
    expect(entity.category).toBe('guide');
    expect(entity.tags).toEqual(['x']);
    expect(entity.metadata).toEqual({ a: 1 });
  });
});
