import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { createApp } from '../../src/app';
import { getTestDataSource, closeTestDataSource } from '../helpers/testDatabase';
import { RequirementRepository } from '../../src/infrastructure/repositories/RequirementRepository';
import { Requirement } from '../../src/domain/requirement/models/Requirement';
import { Priority } from '../../src/domain/requirement/value-objects/Priority';
import { RequirementSource } from '../../src/domain/requirement/value-objects/RequirementSource';

describe('Requirement API E2E Tests', () => {
  let app: FastifyInstance;
  let dataSource: DataSource;
  let repository: RequirementRepository;
  let requirementId: string;

  beforeAll(async () => {
    dataSource = await getTestDataSource();
    app = await createApp(dataSource);
    await app.ready();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
    repository = new RequirementRepository(dataSource);

    const requirement = Requirement.create({
      customerId: 'CUST-REQ-001',
      title: 'Need API access',
      category: 'access',
      priority: Priority.create('medium'),
      source: RequirementSource.create('manual'),
    });

    await repository.save(requirement);
    requirementId = requirement.id;
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  it('should create requirement via API', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/requirements',
      payload: {
        customerId: 'CUST-REQ-002',
        title: 'Add dark mode',
        category: 'ux',
        description: 'Customer wants a dark UI',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data.id).toBeDefined();
    expect(body.data.category).toBe('ux');
  });

  it('should list requirements with filters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/requirements?customerId=CUST-REQ-001&page=1&limit=5`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.total).toBe(1);
  });

  it('should update status', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/requirements/${requirementId}/status`,
      payload: {
        status: 'approved',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.status).toBe('approved');
  });

  it('should delete requirement', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/requirements/${requirementId}`,
    });

    expect(response.statusCode).toBe(204);
  });
});
