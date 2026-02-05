import { describe, expect, it, vi } from 'vitest';
import { ApplySolutionUseCase } from '@application/use-cases/ai/ApplySolutionUseCase';

const aiService = {
  applySolution: vi.fn(),
};

describe('ApplySolutionUseCase', () => {
  it('throws when conversationId missing', async () => {
    const useCase = new ApplySolutionUseCase(aiService as any);
    await expect(useCase.execute({ conversationId: '', solutionType: 'fix' } as any))
      .rejects.toThrow('conversationId is required');
  });

  it('throws when solutionType missing', async () => {
    const useCase = new ApplySolutionUseCase(aiService as any);
    await expect(useCase.execute({ conversationId: 'c1', solutionType: '' } as any))
      .rejects.toThrow('solutionType is required');
  });

  it('delegates to ai service', async () => {
    aiService.applySolution.mockResolvedValue({ status: 'ok' });
    const useCase = new ApplySolutionUseCase(aiService as any);

    const result = await useCase.execute({ conversationId: 'c1', solutionType: 'fix' } as any);

    expect(result.status).toBe('ok');
    expect(aiService.applySolution).toHaveBeenCalledTimes(1);
  });
});
