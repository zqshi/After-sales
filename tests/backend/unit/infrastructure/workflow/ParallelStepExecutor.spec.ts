import { describe, expect, it, vi } from 'vitest';
import { ParallelStepExecutor } from '@infrastructure/workflow/executors/ParallelStepExecutor';

const makeContext = () => ({ executionId: 'ex', workflowName: 'wf' } as any);

describe('ParallelStepExecutor', () => {
  it('supports parallel steps', () => {
    const executor = new ParallelStepExecutor();
    expect(executor.supports({ type: 'parallel' } as any)).toBe(true);
  });

  it('throws when no sub-steps', async () => {
    const executor = new ParallelStepExecutor();
    await expect(executor.execute({ type: 'parallel', name: 'p1', steps: [] } as any, makeContext()))
      .rejects.toThrow('has no sub-steps');
  });

  it('executes sub-steps in batches', async () => {
    const executor = new ParallelStepExecutor(1);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const result = await executor.execute({
      type: 'parallel',
      name: 'p1',
      steps: [{ name: 's1' }, { name: 's2' }],
    } as any, makeContext());

    expect(result.s1).toBeTruthy();
    expect(result.s2).toBeTruthy();
    expect(warnSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
