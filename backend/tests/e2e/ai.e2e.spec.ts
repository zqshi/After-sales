import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { createApp } from '../../src/app';
import { getTestDataSource, closeTestDataSource } from '../helpers/testDatabase';
import { KnowledgeItem } from '../../src/domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '../../src/domain/knowledge/value-objects/KnowledgeCategory';
import { KnowledgeRepository } from '../../src/infrastructure/repositories/KnowledgeRepository';

describe('AI API E2E Tests', () => {
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
      title: 'Billing guidance',
      content: 'Detailed steps for billing',
      category: KnowledgeCategory.create('guide'),
      tags: ['billing', 'payment'],
      source: 'internal',
    });
    await repository.save(item);
    knowledgeId = item.id;
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  it('analyzes conversation and includes recommendations', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/ai/analyze',
      payload: {
        conversationId: 'conv-ai-001',
        context: 'quality',
        options: { keywords: ['billing', 'support'] },
      },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.analysisType).toBe('quality');
    expect(Array.isArray(body.data.result.recommendations)).toBe(true);
    expect(body.data.result.recommendations[0]?.id).toBeDefined();
  });

  it('applies ai solution referencing a knowledge article', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/ai/solutions',
      payload: {
        conversationId: 'conv-ai-002',
        solutionType: 'knowledge_article',
        solutionId: knowledgeId,
        messageTemplate: '参考知识库 {{title}} 解决问题。',
      },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.appliedSolution.type).toBe('knowledge_article');
    expect(body.data.taskDraft?.title).toContain('跟进');
  });
});
