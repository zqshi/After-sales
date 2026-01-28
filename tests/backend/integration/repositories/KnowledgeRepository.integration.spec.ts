import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';

import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { closeTestDataSource, getTestDataSource } from '../../helpers/testDatabase';
const describeWithDb = process.env.SKIP_TEST_ENV_SETUP === 'true' ? describe.skip : describe;

describeWithDb('KnowledgeRepository (integration)', () => {
  let dataSource: DataSource;
  let repository: KnowledgeRepository;

  beforeAll(async () => {
    dataSource = await getTestDataSource();
    repository = new KnowledgeRepository(dataSource);
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await closeTestDataSource();
  });

  it('persists and retrieves a knowledge item', async () => {
    const item = KnowledgeItem.create({
      title: 'Service level overview',
      content: 'Details about 客户等级 commitments',
      category: KnowledgeCategory.create('guide'),
      tags: ['sla', 'guide'],
      source: 'manual',
    });

    await repository.save(item);

    const found = await repository.findById(item.id);
    expect(found).not.toBeNull();
    expect(found?.title).toBe(item.title);
  });

  it('filters by category, tags, and query', async () => {
    await repository.save(
      KnowledgeItem.create({
        title: 'FAQ: billing',
        content: 'Billing related questions',
        category: KnowledgeCategory.create('faq'),
        tags: ['billing'],
        source: 'manual',
      }),
    );

    await repository.save(
      KnowledgeItem.create({
        title: 'Security checklist',
        content: 'Security requirements',
        category: KnowledgeCategory.create('policy'),
        tags: ['security'],
        source: 'manual',
      }),
    );

    const [filtered] = await Promise.all([
      repository.findByFilters({ category: 'faq', tags: ['billing'], query: 'billing' }, { limit: 5, offset: 0 }),
      repository.countByFilters({ category: 'faq' }),
    ]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].category.value).toBe('faq');
  });

  it('deletes a knowledge item', async () => {
    const item = KnowledgeItem.create({
      title: 'Temp doc',
      content: 'Should be deleted',
      category: KnowledgeCategory.create('other'),
      tags: [],
      source: 'manual',
    });

    await repository.save(item);
    await repository.delete(item.id);

    const found = await repository.findById(item.id);
    expect(found).toBeNull();
  });
});
