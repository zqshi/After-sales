import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { createApp } from '../../src/app';
import { getTestDataSource, closeTestDataSource } from '../helpers/testDatabase';
import { OutboxEventBus } from '../../src/infrastructure/events/OutboxEventBus';
import { TaskRepository } from '../../src/infrastructure/repositories/TaskRepository';
import { Task } from '../../src/domain/task/models/Task';
import { TaskPriority } from '../../src/domain/task/value-objects/TaskPriority';
const describeWithDb = process.env.SKIP_TEST_ENV_SETUP === 'true' ? describe.skip : describe;

describeWithDb('Task API E2E Tests', () => {
  let app: FastifyInstance;
  let dataSource: DataSource;
  let repository: TaskRepository;
  let taskId: string;

  beforeAll(async () => {
    dataSource = await getTestDataSource();
    app = await createApp(dataSource);
    await app.ready();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
    repository = new TaskRepository(dataSource, new OutboxEventBus(dataSource));
    const task = Task.create({
      title: 'Follow up issue',
      priority: TaskPriority.create('medium'),
    });
    await repository.save(task);
    taskId = task.id;
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  it('should create task', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: {
        title: 'Resolve bug',
        description: 'Fix the login bug',
      },
    });
    expect(response.statusCode).toBe(201);
  });

  it('should list tasks', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tasks?page=1&limit=5',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.items.length).toBe(1);
  });

  it('should assign task', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/assign`,
      payload: { assigneeId: 'user-1' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.assigneeId).toBe('user-1');
  });

  it('should update status', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskId}/status`,
      payload: { status: 'in_progress' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.status).toBe('in_progress');
  });

  it('should complete task', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/complete`,
      payload: {
        qualityScore: { timeliness: 80, completeness: 90, satisfaction: 100 },
      },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.status).toBe('completed');
  });
});
