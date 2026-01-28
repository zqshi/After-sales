import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { createApp } from '../../src/app';
import { getTestDataSource, closeTestDataSource } from '../helpers/testDatabase';
import { KnowledgeItem } from '../../src/domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '../../src/domain/knowledge/value-objects/KnowledgeCategory';
import { KnowledgeRepository } from '../../src/infrastructure/repositories/KnowledgeRepository';
const describeWithDb = process.env.SKIP_TEST_ENV_SETUP === 'true' ? describe.skip : describe;

describeWithDb('Knowledge API E2E Tests', () => {
  let app: FastifyInstance;
  let dataSource: DataSource;
  let repository: KnowledgeRepository;
  let knowledgeId: string;

  beforeAll(async () => {
    dataSource = await getTestDataSource();
    app = await createApp(dataSource);
    await app.ready();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
    repository = new KnowledgeRepository(dataSource);
    const item = KnowledgeItem.create({
      title: 'Support FAQ',
      content: 'FAQ content',
      category: KnowledgeCategory.create('faq'),
      tags: ['support', 'faq'],
      source: 'internal',
    });
    await repository.save(item);
    knowledgeId = item.id;
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  it('creates knowledge item', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/knowledge',
      payload: {
        title: 'Guide to billing',
        content: 'Billing steps',
        category: 'guide',
        tags: ['billing'],
        source: 'manual',
      },
    });
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data.title).toBe('Guide to billing');
  });

  it('lists knowledge items', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge?page=1&limit=5',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.items.length).toBe(1);
  });

  it('updates knowledge item', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/knowledge/${knowledgeId}`,
      payload: { title: 'Updated FAQ' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.title).toBe('Updated FAQ');
  });

  it('deletes knowledge item', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/knowledge/${knowledgeId}`,
    });
    expect(response.statusCode).toBe(204);
  });
});
