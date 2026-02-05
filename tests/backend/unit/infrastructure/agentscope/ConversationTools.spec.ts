import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildConversationTools } from '@infrastructure/agentscope/tools/ConversationTools';

const makeDeps = () => ({
  createConversationUseCase: { execute: vi.fn().mockResolvedValue({ id: 'c1' }) },
  sendMessageUseCase: { execute: vi.fn().mockResolvedValue({ id: 'm1' }) },
  getConversationUseCase: { execute: vi.fn().mockResolvedValue({ id: 'c1' }) },
  closeConversationUseCase: { execute: vi.fn().mockResolvedValue({ closed: true }) },
  conversationRepository: { findById: vi.fn() },
});

describe('ConversationTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates conversation with initial message', async () => {
    const deps = makeDeps();
    const tools = buildConversationTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'createConversation')!.handler;

    await handler({
      customerId: 'cust-1',
      channel: 'chat',
      initialMessage: { senderId: 'cust-1', content: 'hello' },
    });

    expect(deps.createConversationUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('gets conversation with includeMessages false', async () => {
    const deps = makeDeps();
    const tools = buildConversationTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'getConversation')!.handler;

    await handler({ conversationId: 'c1', includeMessages: 'false' });

    expect(deps.getConversationUseCase.execute).toHaveBeenCalledWith({
      conversationId: 'c1',
      includeMessages: false,
    });
  });

  it('returns conversation history with metadata', async () => {
    const deps = makeDeps();
    deps.conversationRepository.findById.mockResolvedValue({
      id: 'c1',
      messages: [
        { senderType: 'customer', senderId: 'u1', content: 'hi', sentAt: new Date('2026-01-01T00:00:00Z'), metadata: { a: 1 } },
      ],
    });
    const tools = buildConversationTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'getConversationHistory')!.handler;

    const result = await handler({ conversationId: 'c1', includeMetadata: true, limit: 1 });

    expect(result[0].metadata).toEqual({ a: 1 });
  });

  it('throws when conversation history missing', async () => {
    const deps = makeDeps();
    deps.conversationRepository.findById.mockResolvedValue(null);
    const tools = buildConversationTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'getConversationHistory')!.handler;

    await expect(handler({ conversationId: 'c1' })).rejects.toThrow('Conversation not found: c1');
  });

  it('returns conversation context and defaults limit', async () => {
    const deps = makeDeps();
    deps.conversationRepository.findById.mockResolvedValue({
      id: 'c1',
      customerId: 'cust-1',
      status: 'open',
      channel: { value: 'email' },
      priority: 'normal',
      messages: [],
    });
    const tools = buildConversationTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'getConversationContext')!.handler;

    const result = await handler({ conversationId: 'c1', limit: -1 });

    expect(result.conversation.id).toBe('c1');
  });

  it('sends message', async () => {
    const deps = makeDeps();
    const tools = buildConversationTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'sendMessage')!.handler;

    await handler({ conversationId: 'c1', senderId: 'u1', senderType: 'external', content: 'hi' });

    expect(deps.sendMessageUseCase.execute).toHaveBeenCalledWith({
      conversationId: 'c1',
      senderId: 'u1',
      senderType: 'external',
      content: 'hi',
    });
  });

  it('returns IM channel close warning', async () => {
    const deps = makeDeps();
    deps.conversationRepository.findById.mockResolvedValue({ channel: { value: 'wecom' } });
    const tools = buildConversationTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'closeConversation')!.handler;

    const result = await handler({ conversationId: 'c1', closedBy: 'u1' });

    expect(result.success).toBe(false);
    expect(deps.closeConversationUseCase.execute).not.toHaveBeenCalled();
  });

  it('closes conversation for non-IM channel', async () => {
    const deps = makeDeps();
    deps.conversationRepository.findById.mockResolvedValue({ channel: { value: 'email' } });
    const tools = buildConversationTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'closeConversation')!.handler;

    await handler({ conversationId: 'c1', closedBy: 'u1' });

    expect(deps.closeConversationUseCase.execute).toHaveBeenCalledTimes(1);
  });
});
