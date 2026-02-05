import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';
import { HumanInLoopExecutor } from '@infrastructure/workflow/executors/HumanInLoopExecutor';

const makeContext = () => ({ executionId: 'ex', workflowName: 'wf' } as any);

describe('HumanInLoopExecutor', () => {
  it('supports human_in_loop steps', () => {
    const executor = new HumanInLoopExecutor();
    expect(executor.supports({ type: 'human_in_loop' } as any)).toBe(true);
  });

  it('returns approved response', async () => {
    const emitter = new EventEmitter();
    const executor = new HumanInLoopExecutor(emitter);
    const executePromise = executor.execute({ type: 'human_in_loop', name: 'review', input: { a: 1 } } as any, makeContext());

    await new Promise((resolve) => setTimeout(resolve, 0));
    executor.submitResponse('ex', 'review', { action: 'approve', respondedAt: new Date() } as any);

    const result = await executePromise;
    expect(result.approved).toBe(true);
  });

  it('returns modified response', async () => {
    const executor = new HumanInLoopExecutor();
    const executePromise = executor.execute({ type: 'human_in_loop', name: 'review', input: { a: 1 } } as any, makeContext());

    await new Promise((resolve) => setTimeout(resolve, 0));
    executor.submitResponse('ex', 'review', { action: 'modify', modifiedData: { b: 2 }, respondedAt: new Date() } as any);

    const result = await executePromise;
    expect(result.modified).toBe(true);
    expect(result.data).toEqual({ b: 2 });
  });

  it('throws on reject response', async () => {
    const executor = new HumanInLoopExecutor();
    const executePromise = executor.execute({ type: 'human_in_loop', name: 'review', input: { a: 1 } } as any, makeContext());

    await new Promise((resolve) => setTimeout(resolve, 0));
    executor.submitResponse('ex', 'review', { action: 'reject', reason: 'no', respondedAt: new Date() } as any);

    await expect(executePromise).rejects.toThrow('Human rejected');
  });

  it('auto-approves on timeout response when fallback set', async () => {
    const executor = new HumanInLoopExecutor();
    const executePromise = executor.execute({ type: 'human_in_loop', name: 'review', input: { a: 1 }, fallback: 'auto_approve' } as any, makeContext());

    await new Promise((resolve) => setTimeout(resolve, 0));
    executor.submitResponse('ex', 'review', { action: 'timeout', respondedAt: new Date() } as any);

    const result = await executePromise;
    expect(result.autoApproved).toBe(true);
  });

  it('warns when submitResponse has no pending request', () => {
    const executor = new HumanInLoopExecutor();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    executor.submitResponse('missing', 'step', { action: 'approve', respondedAt: new Date() } as any);
    expect(warnSpy).toHaveBeenCalled();
  });
});
