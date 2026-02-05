import { describe, it, expect, vi } from 'vitest';
import { TaskApplicationService } from '../TaskApplicationService.js';

const createTaskData = () => ({
  id: 'T1',
  title: 't',
  description: 'd',
  priority: 'low',
  type: 'follow_up',
  assignedTo: 'a0',
  assignedToName: 'Prev',
  assigneeId: 'a1',
  assigneeName: 'Agent',
  conversationId: 'c1',
  requirementId: 'r1',
  dueDate: 't1',
  status: 'pending',
});


describe('TaskApplicationService', () => {
  it('createTask passes payload', async () => {
    const repo = { create: vi.fn().mockResolvedValue({ success: true }) };
    const eventBus = { publish: vi.fn() };
    const service = new TaskApplicationService({ taskRepository: repo, eventBus });

    const result = await service.createTask({ title: 't', description: 'd', priority: 'low', type: 'follow_up' });
    expect(result.success).toBe(true);
    expect(repo.create).toHaveBeenCalled();
  });

  it('assignTask loads task and publishes', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue(createTaskData()),
      assign: vi.fn().mockResolvedValue({ success: true }),
    };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new TaskApplicationService({ taskRepository: repo, eventBus });

    const result = await service.assignTask({ taskId: 'T1', assigneeId: 'a2', assigneeName: 'B', reason: 'shift' });
    expect(result.success).toBe(true);
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('updateTaskStatus handles status transitions', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue(createTaskData()),
      updateStatus: vi.fn().mockResolvedValue({ success: true }),
    };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new TaskApplicationService({ taskRepository: repo, eventBus });

    const result = await service.updateTaskStatus({ taskId: 'T1', status: 'completed', reason: 'done' });
    expect(result.success).toBe(true);
  });

  it('completeTask publishes completion', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue(createTaskData()),
      complete: vi.fn().mockResolvedValue({ success: true }),
    };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new TaskApplicationService({ taskRepository: repo, eventBus });

    const result = await service.completeTask({ taskId: 'T1', completedBy: 'a1', completionNotes: 'ok', actualHours: 1, qualityScore: 90 });
    expect(result.success).toBe(true);
  });

  it('getTask and listTasks delegate to repo', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'T1' }),
      list: vi.fn().mockResolvedValue([{ id: 'T1' }]),
    };
    const eventBus = { publish: vi.fn() };
    const service = new TaskApplicationService({ taskRepository: repo, eventBus });

    const task = await service.getTask({ taskId: 'T1' });
    expect(task.id).toBe('T1');

    const list = await service.listTasks({ assigneeId: 'a1', status: 'all', priority: 'all', page: 1, limit: 10 });
    expect(list.length).toBe(1);
  });

  it('throws when task missing', async () => {
    const repo = { findById: vi.fn().mockResolvedValue(null) };
    const eventBus = { publish: vi.fn() };
    const service = new TaskApplicationService({ taskRepository: repo, eventBus });

    await expect(service.assignTask({ taskId: 'missing', assigneeId: 'a1' })).rejects.toThrow('Task not found');
  });
});
