import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateConversationUseCase } from '@application/use-cases/CreateConversationUseCase';

const conversationRepository = {
  save: vi.fn(),
};
const eventBus = {
  publishAll: vi.fn(),
};

const baseRequest = {
  customerId: 'customer-1',
  channel: 'chat',
  agentId: 'agent-1',
  priority: 'normal' as const,
  mode: 'agent_supervised' as const,
  metadata: { title: 'Conversation A' },
};

describe('CreateConversationUseCase', () => {
  beforeEach(() => {
    conversationRepository.save.mockReset();
    eventBus.publishAll.mockReset();
  });

  it('creates conversation with default initial message sender type', async () => {
    const useCase = new CreateConversationUseCase(
      conversationRepository as any,
      eventBus as any,
    );

    const result = await useCase.execute({
      ...baseRequest,
      initialMessage: {
        senderId: 'customer-1',
        content: 'hello',
      },
    });

    expect(result.id).toBeTruthy();
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].senderType).toBe('customer');
    expect(conversationRepository.save).toHaveBeenCalledTimes(1);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('creates conversation without initial message', async () => {
    const useCase = new CreateConversationUseCase(
      conversationRepository as any,
      eventBus as any,
    );

    const result = await useCase.execute({
      ...baseRequest,
      initialMessage: undefined,
    });

    expect(result.messages).toHaveLength(0);
  });

  it('maps internal sender type to agent', async () => {
    const useCase = new CreateConversationUseCase(
      conversationRepository as any,
      eventBus as any,
    );

    const result = await useCase.execute({
      ...baseRequest,
      initialMessage: {
        senderId: 'agent-1',
        senderType: 'internal',
        content: 'hello',
      },
    });

    expect(result.messages[0].senderType).toBe('agent');
  });

  it('throws validation error for invalid payload', async () => {
    const useCase = new CreateConversationUseCase(
      conversationRepository as any,
      eventBus as any,
    );

    await expect(
      useCase.execute({
        ...baseRequest,
        slaDeadline: 'invalid-date',
      } as any),
    ).rejects.toThrow('Validation failed');
  });
});
