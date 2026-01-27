import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';

import { Task } from '@domain/task/models/Task';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';
import { OutboxEventBus } from '@infrastructure/events/OutboxEventBus';
import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { closeTestDataSource, getTestDataSource } from '../../helpers/testDatabase';

describe('TaskRepository (integration)', () => {
  let dataSource: DataSource;
  let repository: TaskRepository;

  beforeAll(async () => {
    dataSource = await getTestDataSource();
    repository = new TaskRepository(dataSource, new OutboxEventBus(dataSource));
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await closeTestDataSource();
  });

  it('persists a task and retrieves it by id', async () => {
    const task = Task.create({
      title: 'Follow up support case',
      priority: TaskPriority.create('high'),
    });

    await repository.save(task);
    const found = await repository.findById(task.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(task.id);
    expect(found?.title).toBe(task.title);
  });

  it('filters tasks by assignee and status', async () => {
    await repository.save(
      Task.create({
        title: 'Document onboarding',
        assigneeId: 'agent-1',
        priority: TaskPriority.create('medium'),
        metadata: { requirementId: 'req-1' },
      }),
    );

    await repository.save(
      Task.create({
        title: 'Resolve billing issue',
        assigneeId: 'agent-2',
        priority: TaskPriority.create('urgent'),
        metadata: { requirementId: 'req-2' },
      }),
    );

    const [filtered] = await Promise.all([
      repository.findByFilters(
        {
          assigneeId: 'agent-1',
          priority: 'medium',
        },
        { limit: 5, offset: 0 },
      ),
      repository.countByFilters({
        assigneeId: 'agent-1',
      }),
    ]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].assigneeId).toBe('agent-1');
  });
});
