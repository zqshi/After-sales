import { describe, expect, it, vi } from 'vitest';
import { CreateProblemUseCase } from '@application/use-cases/problem/CreateProblemUseCase';

const repository = {
  save: vi.fn(),
};

describe('CreateProblemUseCase', () => {
  it('creates and saves problem', async () => {
    const useCase = new CreateProblemUseCase(repository as any);
    const problem = await useCase.execute({
      customerId: 'cust-1',
      conversationId: 'conv-1',
      title: 'Title',
      description: 'Desc',
      intent: 'intent',
      confidence: 0.8,
      metadata: { a: 1 },
    });

    expect(problem.title).toBe('Title');
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
