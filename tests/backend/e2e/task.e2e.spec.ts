import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { createApp } from '../../../backend/src/app';
import { getTestDataSource, closeTestDataSource } from '../helpers/testDatabase';
import { OutboxEventBus } from '../../../backend/src/infrastructure/events/OutboxEventBus';
import { TaskRepository } from '../../../backend/src/infrastructure/repositories/TaskRepository';
import { Task } from '../../../backend/src/domain/task/models/Task';
import { TaskPriority } from '../../../backend/src/domain/task/value-objects/TaskPriority';
const describeWithDb = process.env.SKIP_TEST_ENV_SETUP === 'true' ? describe.skip : describe;
const API_PREFIX = '/api/v1/api';

describeWithDb('Task API E2E Tests', () => {
  let app: FastifyInstance;
  let authHeaders: Record<string, string>;
  let dataSource: DataSource;
  let repository: TaskRepository;
  let taskId: string;

  const withAuth = (options: Parameters<FastifyInstance['inject']>[0]) => app.inject({ ...options, headers: authHeaders });
  beforeAll(async () => {
    dataSource = await getTestDataSource();
    app = await createApp(dataSource);
    await app.ready();
    const token = app.jwt.sign({ sub: 'AGENT-TASK-001', role: 'admin' });
    authHeaders = { Authorization: `Bearer ${token}` };
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
    repository = new TaskRepository(dataSource, new OutboxEventBus(dataSource));
    const task = Task.create({
      title: 'Follow up issue',
      priority: TaskPriority.create('medium'),
      assigneeId: 'AGENT-TASK-001',
    });
    await repository.save(task);
    taskId = task.id;
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  it('should create task', async () => {
    const response = await withAuth({
      method: 'POST',
      url: `${API_PREFIX}/tasks`,
      payload: {
        title: 'Resolve bug',
        description: 'Fix the login bug',
      },
    });
    expect(response.statusCode).toBe(201);
  });

  it('should list tasks', async () => {
    const response = await withAuth({
      method: 'GET',
      url: `${API_PREFIX}/tasks?page=1&limit=5`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.items.length).toBe(1);
  });

  it('should assign task', async () => {
    const response = await withAuth({
      method: 'POST',
      url: `${API_PREFIX}/tasks/${taskId}/assign`,
      payload: { assigneeId: 'AGENT-TASK-001' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.assigneeId).toBe('AGENT-TASK-001');
  });

  it('should update status', async () => {
    const response = await withAuth({
      method: 'PATCH',
      url: `${API_PREFIX}/tasks/${taskId}/status`,
      payload: { status: 'in_progress' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.status).toBe('in_progress');
  });

  it('should complete task', async () => {
    const response = await withAuth({
      method: 'POST',
      url: `${API_PREFIX}/tasks/${taskId}/complete`,
      payload: {
        qualityScore: { timeliness: 80, completeness: 90, satisfaction: 100 },
      },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.status).toBe('completed');
  });
});
