import { describe, expect, it, vi } from 'vitest';
import { TaskController } from '@presentation/http/controllers/TaskController';
import { ForbiddenError } from '@application/services/ResourceAccessControl';
import { ValidationError } from '@infrastructure/validation/Validator';

const makeReply = () => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
});

describe('TaskController', () => {
  const createTaskUseCase = { execute: vi.fn() };
  const getTaskUseCase = { execute: vi.fn() };
  const listTasksUseCase = { execute: vi.fn() };
  const assignTaskUseCase = { execute: vi.fn() };
  const updateTaskStatusUseCase = { execute: vi.fn() };
  const completeTaskUseCase = { execute: vi.fn() };

  const controller = new TaskController(
    createTaskUseCase as any,
    getTaskUseCase as any,
    listTasksUseCase as any,
    assignTaskUseCase as any,
    updateTaskStatusUseCase as any,
    completeTaskUseCase as any,
  );

  it('creates task', async () => {
    createTaskUseCase.execute.mockResolvedValue({ id: 't1' });
    const reply = makeReply();

    await controller.createTask({ body: { title: 'Task' } } as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(201);
  });

  it('handles action missing', async () => {
    const reply = makeReply();
    await controller.handleAction({ params: { id: 't1' }, body: {} } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(400);
  });

  it('handles cancel action', async () => {
    updateTaskStatusUseCase.execute.mockResolvedValue({ id: 't1' });
    const reply = makeReply();
    await controller.handleAction({ params: { id: 't1' }, body: { action: 'cancel' } } as any, reply as any);
    expect(updateTaskStatusUseCase.execute).toHaveBeenCalledWith({
      taskId: 't1',
      status: 'cancelled',
      userId: undefined,
    });
  });

  it('handles execute action', async () => {
    updateTaskStatusUseCase.execute.mockResolvedValue({ id: 't1' });
    const reply = makeReply();
    await controller.handleAction({ params: { id: 't1' }, body: { action: 'execute' } } as any, reply as any);
    expect(updateTaskStatusUseCase.execute).toHaveBeenCalledWith({
      taskId: 't1',
      status: 'in_progress',
      userId: undefined,
    });
  });

  it('handles unsupported action', async () => {
    const reply = makeReply();
    await controller.handleAction({ params: { id: 't1' }, body: { action: 'other' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(400);
  });

  it('handles validation error', async () => {
    createTaskUseCase.execute.mockRejectedValue(new ValidationError('bad', []));
    const reply = makeReply();
    await controller.createTask({ body: { title: '' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(400);
  });

  it('handles forbidden error', async () => {
    getTaskUseCase.execute.mockRejectedValue(new ForbiddenError('nope'));
    const reply = makeReply();
    await controller.getTask({ params: { id: 't1' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it('handles not found error', async () => {
    getTaskUseCase.execute.mockRejectedValue(new Error('task not found'));
    const reply = makeReply();
    await controller.getTask({ params: { id: 't1' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(404);
  });

  it('lists tasks with parsed query', async () => {
    listTasksUseCase.execute.mockResolvedValue([]);
    const reply = makeReply();
    await controller.listTasks({ query: { page: '2', limit: '5', status: 'open' } } as any, reply as any);
    expect(listTasksUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 5, status: 'open' }),
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('assigns task with user id', async () => {
    assignTaskUseCase.execute.mockResolvedValue({ id: 't1' });
    const reply = makeReply();
    await controller.assignTask(
      { params: { id: 't1' }, body: { assigneeId: 'u2' }, user: { sub: 'u1' } } as any,
      reply as any,
    );
    expect(assignTaskUseCase.execute).toHaveBeenCalledWith({
      taskId: 't1',
      assigneeId: 'u2',
      userId: 'u1',
    });
  });

  it('updates task status with user id', async () => {
    updateTaskStatusUseCase.execute.mockResolvedValue({ id: 't1' });
    const reply = makeReply();
    await controller.updateStatus(
      { params: { id: 't1' }, body: { status: 'completed' }, user: { sub: 'u1' } } as any,
      reply as any,
    );
    expect(updateTaskStatusUseCase.execute).toHaveBeenCalledWith({
      taskId: 't1',
      status: 'completed',
      userId: 'u1',
    });
  });

  it('completes task with quality score', async () => {
    completeTaskUseCase.execute.mockResolvedValue({ id: 't1' });
    const reply = makeReply();
    await controller.completeTask(
      {
        params: { id: 't1' },
        body: { qualityScore: { timeliness: 1, completeness: 1, satisfaction: 1 } },
        user: { sub: 'u1' },
      } as any,
      reply as any,
    );
    expect(completeTaskUseCase.execute).toHaveBeenCalledWith({
      taskId: 't1',
      qualityScore: { timeliness: 1, completeness: 1, satisfaction: 1 },
      userId: 'u1',
    });
  });

  it('handles invalid error message and non-error', async () => {
    getTaskUseCase.execute.mockRejectedValue(new Error('invalid payload'));
    const replyInvalid = makeReply();
    await controller.getTask({ params: { id: 't1' } } as any, replyInvalid as any);
    expect(replyInvalid.code).toHaveBeenCalledWith(400);

    listTasksUseCase.execute.mockRejectedValue('boom');
    const replyNonError = makeReply();
    await controller.listTasks({ query: {} } as any, replyNonError as any);
    expect(replyNonError.code).toHaveBeenCalledWith(500);
  });
});
