import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetAuditSummaryUseCase } from '@application/use-cases/audit/GetAuditSummaryUseCase';

const repo = {
  getSummary: vi.fn(),
};

describe('GetAuditSummaryUseCase', () => {
  beforeEach(() => {
    repo.getSummary.mockReset();
  });
  it('returns summary for valid days', async () => {
    repo.getSummary.mockResolvedValueOnce({
      total: 5,
      byAction: { create: 2, update: 3 },
      byResource: { conversation: 4, task: 1 },
    });

    const useCase = new GetAuditSummaryUseCase(repo as any);
    const result = await useCase.execute(3);

    expect(result.total).toBe(5);
    expect(result.byAction.update).toBe(3);
    expect(result.byResource.task).toBe(1);
    expect(repo.getSummary).toHaveBeenCalledTimes(1);
  });

  it('uses default days when invalid', async () => {
    repo.getSummary.mockResolvedValueOnce({
      total: 0,
      byAction: {},
      byResource: {},
    });
    const useCase = new GetAuditSummaryUseCase(repo as any);
    const result = await useCase.execute(Number.NaN);
    expect(result.total).toBe(0);
    expect(repo.getSummary).toHaveBeenCalledTimes(1);
  });
});
