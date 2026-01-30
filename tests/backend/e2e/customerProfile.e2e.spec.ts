/**
 * Customer Profile API E2E Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { createApp } from '../../src/app';
import { getTestDataSource, closeTestDataSource } from '../helpers/testDatabase';
import { CustomerProfile } from '../../src/domain/customer/models/CustomerProfile';
import { ContactInfo } from '../../src/domain/customer/value-objects/ContactInfo';
import { CustomerLevelInfo } from '../../src/domain/customer/value-objects/CustomerLevelInfo';
import { Metrics } from '../../src/domain/customer/value-objects/Metrics';
import { CustomerProfileRepository } from '../../src/infrastructure/repositories/CustomerProfileRepository';
const describeWithDb = process.env.SKIP_TEST_ENV_SETUP === 'true' ? describe.skip : describe;
const API_PREFIX = '/api/v1/api';

describeWithDb('Customer Profile API E2E Tests', () => {
  let app: FastifyInstance;
  let authHeaders: Record<string, string>;
  let dataSource: DataSource;
  let repository: CustomerProfileRepository;
  let customerId: string;

  const withAuth = (options: Parameters<FastifyInstance['inject']>[0]) => app.inject({ ...options, headers: authHeaders });
  beforeAll(async () => {
    dataSource = await getTestDataSource();
    app = await createApp(dataSource);
    await app.ready();
    const token = app.jwt.sign({ sub: 'ADMIN-USER', role: 'admin' });
    authHeaders = { Authorization: `Bearer ${token}` };
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
    repository = new CustomerProfileRepository(dataSource);

    const profile = CustomerProfile.create({
      customerId: 'CUST-E2E-100',
      name: 'E2E Customer',
      contactInfo: ContactInfo.create({
        email: 'e2e@example.com',
        phone: '+123456789',
        preferredChannel: 'chat',
      }),
      slaInfo: CustomerLevelInfo.create({
        serviceLevel: 'gold',
        responseTimeTargetMinutes: 5,
        resolutionTimeTargetMinutes: 60,
      }),
      metrics: Metrics.create({
        satisfactionScore: 80,
        issueCount: 2,
        averageResolutionMinutes: 40,
      }),
    });

    await repository.save(profile);
    customerId = profile.customerId;
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  it('GET /api/customers/:id should return profile', async () => {
    const response = await withAuth({
      method: 'GET',
      url: `${API_PREFIX}/customers/${customerId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.customerId).toBe(customerId);
  });

  it('POST /api/customers/:id/refresh should accept new insights', async () => {
    const response = await withAuth({
      method: 'POST',
      url: `${API_PREFIX}/customers/${customerId}/refresh`,
      payload: {
        source: 'manual',
        insights: [{ title: 'New Insight', detail: 'Detail' }],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.insights).toHaveLength(1);
  });

  it('POST /api/customers/:id/service-records should add record', async () => {
    const response = await withAuth({
      method: 'POST',
      url: `${API_PREFIX}/customers/${customerId}/service-records`,
      payload: {
        title: 'Follow-up',
        description: 'Discussed with customer',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data.serviceRecords).toHaveLength(1);
  });

  it('PATCH /api/customers/:id/commitments/:commitmentId should update progress', async () => {
    const response = await withAuth({
      method: 'PATCH',
      url: `${API_PREFIX}/customers/${customerId}/commitments/commit-123`,
      payload: { progress: 45 },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.commitments).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'commit-123' })]),
    );
  });

  it('POST /api/customers/:id/interactions should record interaction', async () => {
    const response = await withAuth({
      method: 'POST',
      url: `${API_PREFIX}/customers/${customerId}/interactions`,
      payload: {
        interactionType: 'chat',
        notes: 'Customer requested update',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data.interactions).toHaveLength(1);
  });

  it('POST /api/customers/:id/mark-vip should toggle VIP status', async () => {
    const response = await withAuth({
      method: 'POST',
      url: `${API_PREFIX}/customers/${customerId}/mark-vip`,
      payload: { reason: 'High value' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.isVIP).toBe(true);
  });
});
