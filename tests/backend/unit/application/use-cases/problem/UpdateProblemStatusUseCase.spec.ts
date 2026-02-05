import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UpdateProblemStatusUseCase } from '@application/use-cases/problem/UpdateProblemStatusUseCase';

describe('UpdateProblemStatusUseCase', () => {
  const problemRepository = {
    findById: vi.fn(),
    save: vi.fn(),
  };

  beforeEach(() => {
    problemRepository.findById.mockReset();
    problemRepository.save.mockReset();
  });

  it('throws when problem is missing', async () => {
    const useCase = new UpdateProblemStatusUseCase(problemRepository as any);
    problemRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute({ problemId: 'p1', status: 'resolved' } as any)).rejects.toThrow(
      'Problem p1 not found',
    );
  });

  it('updates status via specialized methods', async () => {
    const problem = {
      updateMetadata: vi.fn(),
      resolve: vi.fn(),
      reopen: vi.fn(),
      markInProgress: vi.fn(),
      markWaitingCustomer: vi.fn(),
      updateStatus: vi.fn(),
    };
    problemRepository.findById.mockResolvedValue(problem);

    const useCase = new UpdateProblemStatusUseCase(problemRepository as any);
    await useCase.execute({ problemId: 'p1', status: 'resolved', reason: 'done', metadata: { a: 1 } } as any);

    expect(problem.updateMetadata).toHaveBeenCalledWith({ a: 1 });
    expect(problem.resolve).toHaveBeenCalledWith('done');
    expect(problemRepository.save).toHaveBeenCalledWith(problem);
  });
});
