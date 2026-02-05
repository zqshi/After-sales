import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationReadyToCloseEventHandler } from '@application/event-handlers/ConversationReadyToCloseEventHandler';
import { ConversationReadyToCloseEvent } from '@domain/conversation/events/ConversationReadyToCloseEvent';
import { Conversation } from '@domain/conversation/models/Conversation';
import { Channel } from '@domain/conversation/value-objects/Channel';

const makeEvent = (overrides: Partial<any> = {}) => new ConversationReadyToCloseEvent(
  { aggregateId: 'c1' },
  {
    conversationId: 'c1',
    reason: 'All tasks completed',
    completedTasksCount: 2,
    ...overrides,
  },
);

describe('ConversationReadyToCloseEventHandler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('returns when conversation is missing', async () => {
    const repo = { findById: vi.fn().mockResolvedValue(null), save: vi.fn() };
    const aiService = { summarizeConversation: vi.fn() };
    const handler = new ConversationReadyToCloseEventHandler(repo as any, aiService as any);

    await handler.handle(makeEvent());

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('skips IM conversations', async () => {
    const conversation = Conversation.create({
      customerId: 'cust',
      channel: Channel.fromString('web'),
    });
    const repo = { findById: vi.fn().mockResolvedValue(conversation), save: vi.fn() };
    const aiService = { summarizeConversation: vi.fn() };
    const handler = new ConversationReadyToCloseEventHandler(repo as any, aiService as any);

    await handler.handle(makeEvent());

    expect(repo.save).not.toHaveBeenCalled();
    expect(conversation.status).toBe('open');
  });

  it('skips already closed conversations', async () => {
    const conversation = Conversation.create({
      customerId: 'cust',
      channel: Channel.fromString('email'),
    });
    conversation.close('done');

    const repo = { findById: vi.fn().mockResolvedValue(conversation), save: vi.fn() };
    const aiService = { summarizeConversation: vi.fn() };
    const handler = new ConversationReadyToCloseEventHandler(repo as any, aiService as any);

    await handler.handle(makeEvent());

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('closes conversation with AI summary', async () => {
    const conversation = Conversation.create({
      customerId: 'cust',
      channel: Channel.fromString('email'),
    });
    const repo = { findById: vi.fn().mockResolvedValue(conversation), save: vi.fn().mockResolvedValue(undefined) };
    const aiService = { summarizeConversation: vi.fn().mockResolvedValue('AI summary') };
    const handler = new ConversationReadyToCloseEventHandler(repo as any, aiService as any);

    await handler.handle(makeEvent({ completedTasksCount: 3 }));

    expect(conversation.status).toBe('closed');
    const closedEvent = conversation.getUncommittedEvents().find((event) => event.eventType === 'ConversationClosed');
    expect(closedEvent?.payload?.resolution).toContain('所有3个任务已完成。AI summary');
    expect(repo.save).toHaveBeenCalledWith(conversation);
  });

  it('falls back to reason when AI summary fails', async () => {
    const conversation = Conversation.create({
      customerId: 'cust',
      channel: Channel.fromString('email'),
    });
    const repo = { findById: vi.fn().mockResolvedValue(conversation), save: vi.fn().mockResolvedValue(undefined) };
    const aiService = { summarizeConversation: vi.fn().mockRejectedValue(new Error('ai down')) };
    const handler = new ConversationReadyToCloseEventHandler(repo as any, aiService as any);

    await handler.handle(makeEvent({ completedTasksCount: 0, reason: 'Fallback reason' }));

    const closedEvent = conversation.getUncommittedEvents().find((event) => event.eventType === 'ConversationClosed');
    expect(closedEvent?.payload?.resolution).toBe('Fallback reason');
    expect(repo.save).toHaveBeenCalledWith(conversation);
  });
});
