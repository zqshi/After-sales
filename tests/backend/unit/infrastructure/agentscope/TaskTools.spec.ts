import { describe, expect, it, vi } from 'vitest';
import { buildTaskTools } from '@infrastructure/agentscope/tools/TaskTools';

describe('TaskTools', () => {
  it('creates task with optional fields', async () => {
    const deps = {
      createTaskUseCase: { execute: vi.fn().mockResolvedValue({ id: 't1' }) },
      updateTaskStatusUseCase: { execute: vi.fn() },
      taskRepository: { searchByQuery: vi.fn() },
    };
    const tools = buildTaskTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'createTask')!.handler;

    await handler({
      title: 'Task',
      type: 'support',
      priority: 'high',
      metadata: { foo: 'bar' },
    });

    expect(deps.createTaskUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('updates task status', async () => {
    const deps = {
      createTaskUseCase: { execute: vi.fn() },
      updateTaskStatusUseCase: { execute: vi.fn().mockResolvedValue({ id: 't1' }) },
      taskRepository: { searchByQuery: vi.fn() },
    };
    const tools = buildTaskTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'updateTaskStatus')!.handler;

    await handler({ taskId: 't1', status: 'completed' });

    expect(deps.updateTaskStatusUseCase.execute).toHaveBeenCalledWith({
      taskId: 't1',
      status: 'completed',
    });
  });

  it('searches tickets and maps metadata', async () => {
    const deps = {
      createTaskUseCase: { execute: vi.fn() },
      updateTaskStatusUseCase: { execute: vi.fn() },
      taskRepository: {
        searchByQuery: vi.fn().mockResolvedValue([
          {
            id: 't1',
            title: 'Task',
            status: 'open',
            priority: 'high',
            metadata: { resolution: 'fixed', timeSpent: 2 },
            updatedAt: new Date('2026-01-01T00:00:00Z'),
          },
        ]),
      },
    };
    const tools = buildTaskTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'searchTickets')!.handler;

    const result = await handler({ query: 'task', limit: 10, offset: 0 });

    expect(result[0].resolution).toBe('fixed');
    expect(result[0].time_spent).toBe(2);
  });

  it('creates technical ticket', async () => {
    const deps = {
      createTaskUseCase: { execute: vi.fn().mockResolvedValue({ id: 't1' }) },
      updateTaskStatusUseCase: { execute: vi.fn() },
      taskRepository: { searchByQuery: vi.fn() },
    };
    const tools = buildTaskTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'createTechnicalTicket')!.handler;

    await handler({ title: 'Tech', priority: 'low' });

    expect(deps.createTaskUseCase.execute).toHaveBeenCalledWith({
      title: 'Tech',
      type: 'technical',
      conversationId: undefined,
      priority: 'low',
      metadata: undefined,
    });
  });
});
