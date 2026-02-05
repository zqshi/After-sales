import { describe, it, expect, vi } from 'vitest';
import { ConversationApplicationService } from '../ConversationApplicationService.js';

function createConversation({ id = 'c1', status = 'active', messages = [] } = {}) {
  const events = [];
  return {
    id,
    status,
    title: 'Test',
    channel: 'IM',
    participants: [],
    messages,
    closedAt: null,
    sendMessage: vi.fn((payload) => {
      messages.push({ ...payload });
      events.push({ type: 'MessageSent', payload });
    }),
    close: vi.fn(() => {
      events.push({ type: 'ConversationClosed' });
    }),
    assignAgent: vi.fn((payload) => {
      events.push({ type: 'AgentAssigned', payload });
    }),
    getDomainEvents: vi.fn(() => events.slice()),
    clearDomainEvents: vi.fn(() => {
      events.length = 0;
    }),
    getCustomerLevelInfo: vi.fn(() => ({ status: 'normal' })),
  };
}


describe('ConversationApplicationService', () => {
  it('sendMessage publishes domain events', async () => {
    const conversation = createConversation();
    const repo = {
      findById: vi.fn().mockResolvedValue(conversation),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new ConversationApplicationService({ conversationRepository: repo, eventBus });

    const result = await service.sendMessage({
      conversationId: 'c1',
      senderId: 'u1',
      senderType: 'internal',
      content: 'hello',
      timestamp: 't1',
    });

    expect(result.success).toBe(true);
    expect(conversation.sendMessage).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(conversation);
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('sendMessage throws when conversation missing', async () => {
    const repo = { findById: vi.fn().mockResolvedValue(null) };
    const eventBus = { publish: vi.fn() };
    const service = new ConversationApplicationService({ conversationRepository: repo, eventBus });

    await expect(service.sendMessage({ conversationId: 'missing' })).rejects.toThrow('对话不存在');
  });

  it('closeConversation closes and publishes', async () => {
    const conversation = createConversation({ status: 'active' });
    const repo = { findById: vi.fn().mockResolvedValue(conversation), save: vi.fn() };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new ConversationApplicationService({ conversationRepository: repo, eventBus });

    const result = await service.closeConversation({ conversationId: 'c1', closedBy: 'a1', reason: 'done' });
    expect(result.success).toBe(true);
    expect(conversation.close).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('assignAgent assigns and publishes', async () => {
    const conversation = createConversation();
    const repo = { findById: vi.fn().mockResolvedValue(conversation), save: vi.fn() };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new ConversationApplicationService({ conversationRepository: repo, eventBus });

    const result = await service.assignAgent({ conversationId: 'c1', agentId: 'a1', agentName: 'Agent' });
    expect(result.success).toBe(true);
    expect(conversation.assignAgent).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(conversation);
  });

  it('getConversation returns query results', async () => {
    const conversation = createConversation();
    const repo = { findById: vi.fn().mockResolvedValue(conversation) };
    const eventBus = { publish: vi.fn() };
    const service = new ConversationApplicationService({ conversationRepository: repo, eventBus });

    const result = await service.getConversation({ conversationId: 'c1', includeMessages: false });
    expect(result.id).toBe('c1');
    expect(result.messages).toEqual([]);
  });

  it('getConversationList maps items', async () => {
    const conversation = createConversation();
    const repo = { findAll: vi.fn().mockResolvedValue([conversation]) };
    const eventBus = { publish: vi.fn() };
    const service = new ConversationApplicationService({ conversationRepository: repo, eventBus });

    const result = await service.getConversationList({});
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('c1');
  });
});
