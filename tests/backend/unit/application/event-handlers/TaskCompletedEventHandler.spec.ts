import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskCompletedEventHandler } from '@application/event-handlers/TaskCompletedEventHandler';
import { TaskCompletedEvent } from '@domain/task/events/TaskCompletedEvent';
import { Conversation } from '@domain/conversation/models/Conversation';
import { Channel } from '@domain/conversation/value-objects/Channel';

const makeEvent = (payloadOverrides: Partial<any> = {}) => new TaskCompletedEvent(
  { aggregateId: 't1' },
  {
    taskId: 't1',
    conversationId: 'c1',
    completedAt: new Date(),
    ...payloadOverrides,
  },
);

describe('TaskCompletedEventHandler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('returns when task has no conversationId', async () => {
    const taskRepo = { findByFilters: vi.fn() };
    const conversationRepo = { findById: vi.fn() };
    const eventBus = { publish: vi.fn() };
    const handler = new TaskCompletedEventHandler(taskRepo as any, conversationRepo as any, eventBus as any);

    await handler.handle(makeEvent({ conversationId: undefined }));

    expect(taskRepo.findByFilters).not.toHaveBeenCalled();
  });

  it('does not publish when tasks are incomplete', async () => {
    const taskRepo = { findByFilters: vi.fn().mockResolvedValue([{ status: 'in_progress' }]) };
    const conversationRepo = { findById: vi.fn() };
    const eventBus = { publish: vi.fn() };
    const handler = new TaskCompletedEventHandler(taskRepo as any, conversationRepo as any, eventBus as any);

    await handler.handle(makeEvent());

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('skips when conversation not found', async () => {
    const taskRepo = { findByFilters: vi.fn().mockResolvedValue([{ status: 'completed' }]) };
    const conversationRepo = { findById: vi.fn().mockResolvedValue(null) };
    const eventBus = { publish: vi.fn() };
    const handler = new TaskCompletedEventHandler(taskRepo as any, conversationRepo as any, eventBus as any);

    await handler.handle(makeEvent());

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('skips IM conversations', async () => {
    const taskRepo = { findByFilters: vi.fn().mockResolvedValue([{ status: 'completed' }]) };
    const conversation = Conversation.create({ customerId: 'cust', channel: Channel.fromString('web') });
    const conversationRepo = { findById: vi.fn().mockResolvedValue(conversation) };
    const eventBus = { publish: vi.fn() };
    const handler = new TaskCompletedEventHandler(taskRepo as any, conversationRepo as any, eventBus as any);

    await handler.handle(makeEvent());

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('skips already closed conversations', async () => {
    const taskRepo = { findByFilters: vi.fn().mockResolvedValue([{ status: 'completed' }]) };
    const conversation = Conversation.create({ customerId: 'cust', channel: Channel.fromString('email') });
    conversation.close('done');
    const conversationRepo = { findById: vi.fn().mockResolvedValue(conversation) };
    const eventBus = { publish: vi.fn() };
    const handler = new TaskCompletedEventHandler(taskRepo as any, conversationRepo as any, eventBus as any);

    await handler.handle(makeEvent());

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('publishes ConversationReadyToCloseEvent when all tasks complete', async () => {
    const taskRepo = { findByFilters: vi.fn().mockResolvedValue([{ status: 'completed' }, { status: 'cancelled' }]) };
    const conversation = Conversation.create({ customerId: 'cust', channel: Channel.fromString('email') });
    const conversationRepo = { findById: vi.fn().mockResolvedValue(conversation) };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const handler = new TaskCompletedEventHandler(taskRepo as any, conversationRepo as any, eventBus as any);

    await handler.handle(makeEvent());

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const published = eventBus.publish.mock.calls[0][0];
    expect(published.eventType).toBe('ConversationReadyToClose');
  });
});
