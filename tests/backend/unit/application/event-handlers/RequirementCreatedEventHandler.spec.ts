import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequirementCreatedEventHandler } from '@application/event-handlers/RequirementCreatedEventHandler';
import { RequirementCreatedEvent } from '@domain/requirement/events/RequirementCreatedEvent';

const createTaskUseCase = { execute: vi.fn() };
const requirementRepository = { findById: vi.fn() };

const event = new RequirementCreatedEvent(
  { aggregateId: 'req-1' },
  { requirementId: 'req-1', conversationId: 'conv-1', title: 'Title' },
);

describe('RequirementCreatedEventHandler', () => {
  beforeEach(() => {
    createTaskUseCase.execute.mockReset();
    requirementRepository.findById.mockReset();
  });

  it('returns when requirement missing', async () => {
    requirementRepository.findById.mockResolvedValue(null);
    const handler = new RequirementCreatedEventHandler(
      createTaskUseCase as any,
      requirementRepository as any,
    );

    await handler.handle(event);

    expect(createTaskUseCase.execute).not.toHaveBeenCalled();
  });

  it('creates task when requirement allows auto create', async () => {
    requirementRepository.findById.mockResolvedValue({
      priority: { value: 'urgent' },
      shouldAutoCreateTask: () => true,
    });
    const handler = new RequirementCreatedEventHandler(
      createTaskUseCase as any,
      requirementRepository as any,
    );

    await handler.handle(event);

    expect(createTaskUseCase.execute).toHaveBeenCalledTimes(1);
    const payload = createTaskUseCase.execute.mock.calls[0][0];
    expect(payload.priority).toBe('high');
  });

  it('skips task creation when not needed', async () => {
    requirementRepository.findById.mockResolvedValue({
      priority: { value: 'low' },
      shouldAutoCreateTask: () => false,
    });
    const handler = new RequirementCreatedEventHandler(
      createTaskUseCase as any,
      requirementRepository as any,
    );

    await handler.handle(event);

    expect(createTaskUseCase.execute).not.toHaveBeenCalled();
  });

  it('propagates errors from repository', async () => {
    requirementRepository.findById.mockRejectedValue(new Error('boom'));
    const handler = new RequirementCreatedEventHandler(
      createTaskUseCase as any,
      requirementRepository as any,
    );

    await expect(handler.handle(event)).rejects.toThrow('boom');
  });
});
