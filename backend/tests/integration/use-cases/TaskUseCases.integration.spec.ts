import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';

import { AssignTaskUseCase } from '@application/use-cases/task/AssignTaskUseCase';
import { CompleteTaskUseCase } from '@application/use-cases/task/CompleteTaskUseCase';
import { CreateTaskUseCase } from '@application/use-cases/task/CreateTaskUseCase';
import { ListTasksUseCase } from '@application/use-cases/task/ListTasksUseCase';
import { UpdateTaskStatusUseCase } from '@application/use-cases/task/UpdateTaskStatusUseCase';
import { TaskListQueryDTO } from '@application/dto/task/TaskListQueryDTO';
import { AssignTaskRequestDTO } from '@application/dto/task/AssignTaskRequestDTO';
import { CompleteTaskRequestDTO } from '@application/dto/task/CompleteTaskRequestDTO';
import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { closeTestDataSource, getTestDataSource } from '../../helpers/testDatabase';

describe('Task use cases (integration)', () => {
  let dataSource: DataSource;
  let repository: TaskRepository;
  let createUseCase: CreateTaskUseCase;
  let listUseCase: ListTasksUseCase;
  let assignUseCase: AssignTaskUseCase;
  let updateStatusUseCase: UpdateTaskStatusUseCase;
  let completeUseCase: CompleteTaskUseCase;

  beforeAll(async () => {
    dataSource = await getTestDataSource();
    repository = new TaskRepository(dataSource);
    createUseCase = new CreateTaskUseCase(repository);
    listUseCase = new ListTasksUseCase(repository);
    assignUseCase = new AssignTaskUseCase(repository);
    updateStatusUseCase = new UpdateTaskStatusUseCase(repository);
    completeUseCase = new CompleteTaskUseCase(repository);
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await closeTestDataSource();
  });

  it('creates a task and lists it with pagination', async () => {
    const createRequest = {
      title: 'Onboard VIP client',
      description: 'Introduce white-glove service',
      assigneeId: 'agent-9',
      priority: 'high' as const,
    };

    const created = await createUseCase.execute(createRequest);
    expect(created.id).toBeDefined();
    expect(created.assigneeId).toBe('agent-9');

    const query: TaskListQueryDTO = {
      assigneeId: 'agent-9',
      page: 1,
      limit: 5,
    };

    const list = await listUseCase.execute(query);
    expect(list.total).toBe(1);
    expect(list.items[0].title).toBe(createRequest.title);
  });

  it('assigns, updates status, and completes a task', async () => {
    const created = await createUseCase.execute({
      title: 'Fix SLA alert',
      description: 'Investigate overdue queue',
    });

    const assignRequest: AssignTaskRequestDTO = {
      taskId: created.id,
      assigneeId: 'agent-10',
    };

    const assigned = await assignUseCase.execute(assignRequest);
    expect(assigned.assigneeId).toBe('agent-10');

    const updated = await updateStatusUseCase.execute(created.id, { status: 'in_progress' });
    expect(updated.status).toBe('in_progress');

    const completeRequest: CompleteTaskRequestDTO = {
      qualityScore: {
        timeliness: 90,
        completeness: 95,
        satisfaction: 93,
      },
    };

    const completed = await completeUseCase.execute(created.id, completeRequest);
    expect(completed.status).toBe('completed');
    expect(completed.qualityScore).toBeDefined();
    expect(completed.qualityScore).toBeGreaterThan(0);
  });
});
