import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { createApp } from '../../../backend/src/app';
import { getTestDataSource, closeTestDataSource } from '../helpers/testDatabase';
import { OutboxEventBus } from '../../../backend/src/infrastructure/events/OutboxEventBus';
import { RequirementRepository } from '../../../backend/src/infrastructure/repositories/RequirementRepository';
import { Requirement } from '../../../backend/src/domain/requirement/models/Requirement';
import { Priority } from '../../../backend/src/domain/requirement/value-objects/Priority';
import { RequirementSource } from '../../../backend/src/domain/requirement/value-objects/RequirementSource';
const describeWithDb = process.env.SKIP_TEST_ENV_SETUP === 'true' ? describe.skip : describe;
const API_PREFIX = '/api/v1/api';

describeWithDb('Requirement API E2E Tests', () => {
  let app: FastifyInstance;
  let authHeaders: Record<string, string>;
  let dataSource: DataSource;
  let repository: RequirementRepository;
  let requirementId: string;

  const withAuth = (options: Parameters<FastifyInstance['inject']>[0]) => app.inject({ ...options, headers: authHeaders });
  beforeAll(async () => {
    dataSource = await getTestDataSource();
    app = await createApp(dataSource);
    await app.ready();
    const token = app.jwt.sign({ sub: 'AGENT-REQ-001', role: 'admin' });
    authHeaders = { Authorization: `Bearer ${token}` };
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
    repository = new RequirementRepository(dataSource, new OutboxEventBus(dataSource));

    const requirement = Requirement.create({
      customerId: 'CUST-REQ-001',
      title: 'Need API access',
      category: 'access',
      priority: Priority.create('medium'),
      source: RequirementSource.create('manual'),
      createdBy: 'AGENT-REQ-001',
    });

    await repository.save(requirement);
    requirementId = requirement.id;
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  it('should create requirement via API', async () => {
    const response = await withAuth({
      method: 'POST',
      url: `${API_PREFIX}/requirements`,
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
    const response = await withAuth({
      method: 'GET',
      url: `${API_PREFIX}/requirements?customerId=CUST-REQ-001&page=1&limit=5`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.total).toBe(1);
  });

  it('should update status', async () => {
    const response = await withAuth({
      method: 'PATCH',
      url: `${API_PREFIX}/requirements/${requirementId}/status`,
      payload: {
        status: 'approved',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.status).toBe('approved');
  });

  it('should delete requirement', async () => {
    const response = await withAuth({
      method: 'DELETE',
      url: `${API_PREFIX}/requirements/${requirementId}`,
    });

    expect(response.statusCode).toBe(204);
  });
});
