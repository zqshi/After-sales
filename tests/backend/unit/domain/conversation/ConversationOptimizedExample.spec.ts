import { describe, it, expect, vi } from 'vitest';
import { ConversationOptimized } from '@domain/conversation/models/ConversationOptimized.example';
import { Channel } from '@domain/conversation/value-objects/Channel';
import { Message } from '@domain/conversation/models/Message';

const makeMessage = (overrides: Record<string, any> = {}) =>
  Message.create({
    conversationId: 'conv-1',
    senderId: 'cust-1',
    senderType: 'customer',
    content: 'hello',
    ...overrides,
  });

describe('ConversationOptimized example', () => {
  it('creates conversation and sends messages', () => {
    const conversation = ConversationOptimized.create({
      customerId: 'cust-1',
      channel: Channel.fromString('web'),
    });

    const msg = conversation.sendMessage({
      senderId: 'cust-1',
      senderType: 'customer',
      content: 'hello',
    });

    expect(msg.content).toBe('hello');
    expect(conversation.messageSummary.totalCount).toBe(1);
  });

  it('loads full messages with repository and caches', async () => {
    const conversation = ConversationOptimized.create({
      customerId: 'cust-1',
      channel: Channel.fromString('web'),
    });

    const repo = {
      findByConversationId: vi.fn().mockResolvedValue([makeMessage()]),
    };

    const first = await conversation.getFullMessages(repo as any);
    expect(first.length).toBe(1);

    const second = await conversation.getFullMessages(repo as any);
    expect(second.length).toBe(1);
    expect(repo.findByConversationId).toHaveBeenCalledTimes(1);

    const paged = await conversation.getFullMessages(repo as any, { limit: 1, offset: 0 });
    expect(paged.length).toBe(1);
  });

  it('marks messages as read and checks activity', () => {
    const conversation = ConversationOptimized.create({
      customerId: 'cust-1',
      channel: Channel.fromString('web'),
    });

    conversation.sendMessage({
      senderId: 'cust-1',
      senderType: 'customer',
      content: 'hello',
    });

    expect(conversation.isCustomerWaitingForResponse()).toBe(true);
    conversation.markMessagesAsRead();
    expect(conversation.isCustomerWaitingForResponse()).toBe(false);
  });
});
