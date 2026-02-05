import { describe, expect, it, vi } from 'vitest';

describe('test-ai-simple script', () => {
  it('prints success without exiting', async () => {
    vi.resetModules();
    const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'ok' } }],
      }),
      text: vi.fn().mockResolvedValue(''),
    });

    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await import('../../../../backend/test-ai-simple.ts');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalled();
    expect(exitMock).not.toHaveBeenCalled();
  });
});
