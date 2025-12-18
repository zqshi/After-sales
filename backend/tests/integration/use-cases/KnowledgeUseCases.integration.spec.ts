import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';

import { CreateKnowledgeItemUseCase } from '@application/use-cases/knowledge/CreateKnowledgeItemUseCase';
import { DeleteKnowledgeItemUseCase } from '@application/use-cases/knowledge/DeleteKnowledgeItemUseCase';
import { ListKnowledgeItemsUseCase } from '@application/use-cases/knowledge/ListKnowledgeItemsUseCase';
import { UpdateKnowledgeItemUseCase } from '@application/use-cases/knowledge/UpdateKnowledgeItemUseCase';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { KnowledgeListQueryDTO } from '@application/dto/knowledge/KnowledgeListQueryDTO';
import { closeTestDataSource, getTestDataSource } from '../../helpers/testDatabase';

describe('Knowledge use cases (integration)', () => {
  let dataSource: DataSource;
  let repository: KnowledgeRepository;
  let createUseCase: CreateKnowledgeItemUseCase;
  let listUseCase: ListKnowledgeItemsUseCase;
  let updateUseCase: UpdateKnowledgeItemUseCase;
  let deleteUseCase: DeleteKnowledgeItemUseCase;

  beforeAll(async () => {
    dataSource = await getTestDataSource();
    repository = new KnowledgeRepository(dataSource);
    createUseCase = new CreateKnowledgeItemUseCase(repository);
    listUseCase = new ListKnowledgeItemsUseCase(repository);
    updateUseCase = new UpdateKnowledgeItemUseCase(repository);
    deleteUseCase = new DeleteKnowledgeItemUseCase(repository);
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await closeTestDataSource();
  });

  it('creates knowledge item and lists with pagination', async () => {
    const request = {
      title: 'How to enable notifications',
      content: 'Go to settings and toggle notifications.',
      category: 'guide',
      tags: ['notifications', 'guide'],
      source: 'manual',
    };

    const created = await createUseCase.execute(request);
    expect(created.id).toBeDefined();
    expect(created.tags).toEqual(expect.arrayContaining(['notifications']));

    const query: KnowledgeListQueryDTO = {
      query: 'notifications',
      page: 1,
      limit: 5,
    };

    const list = await listUseCase.execute(query);
    expect(list.items).not.toHaveLength(0);
    expect(list.total).toBeGreaterThanOrEqual(1);
  });

  it('updates and deletes a knowledge item', async () => {
    const created = await createUseCase.execute({
      title: 'Deprecated doc',
      content: 'Needs update',
      category: 'other',
      tags: ['deprecated'],
      source: 'manual',
    });

    const updated = await updateUseCase.execute({
      knowledgeId: created.id,
      title: 'Updated doc',
      category: 'guide',
      tags: ['updated'],
    });

    expect(updated.title).toBe('Updated doc');
    expect(updated.category).toBe('guide');
    expect(updated.tags).toContain('updated');

    await deleteUseCase.execute({ knowledgeId: created.id });
    await expect(repository.findById(created.id)).resolves.toBeNull();
  });
});
