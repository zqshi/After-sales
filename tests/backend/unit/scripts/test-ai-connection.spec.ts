import { describe, expect, it, vi } from 'vitest';

describe('test-ai-connection script', () => {
  it('runs without exiting on success', async () => {
    vi.resetModules();
    const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: '{"summary":"ok","recommendations":[]}' } }],
      }),
      text: vi.fn().mockResolvedValue(''),
    });

    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    process.env.AI_SERVICE_URL = 'http://localhost';
    process.env.AI_SERVICE_API_KEY = 'test-key';
    process.env.AI_MODEL = 'test-model';

    await import('../../../../backend/test-ai-connection.ts');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalled();
    expect(exitMock).not.toHaveBeenCalled();
  });

  it('exits with error when a test fails', async () => {
    vi.resetModules();
    const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('fail'),
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '{"summary":"ok","recommendations":[]}' } }],
        }),
        text: vi.fn().mockResolvedValue(''),
      });

    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    process.env.AI_SERVICE_URL = 'http://localhost';
    process.env.AI_SERVICE_API_KEY = 'test-key';
    process.env.AI_MODEL = 'test-model';

    await import('../../../../backend/test-ai-connection.ts');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('handles missing choices and non-JSON content', async () => {
    vi.resetModules();
    const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [],
      }),
      text: vi.fn().mockResolvedValue(''),
    });

    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    process.env.AI_SERVICE_URL = 'http://localhost';
    process.env.AI_SERVICE_API_KEY = 'test-key';
    process.env.AI_MODEL = 'test-model';

    await import('../../../../backend/test-ai-connection.ts');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('exits when AI_SERVICE_URL is missing', async () => {
    vi.resetModules();
    const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env.AI_SERVICE_URL = '';
    process.env.AI_SERVICE_API_KEY = 'test-key';

    await import('../../../../backend/test-ai-connection.ts');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('exits when AI_SERVICE_API_KEY is missing', async () => {
    vi.resetModules();
    const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env.AI_SERVICE_URL = 'http://localhost';
    process.env.AI_SERVICE_API_KEY = '';

    await import('../../../../backend/test-ai-connection.ts');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('covers default model and parse fallback paths', async () => {
    vi.resetModules();
    const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'OK' } }],
        }),
        text: vi.fn().mockResolvedValue(''),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '{bad json' } }],
        }),
        text: vi.fn().mockResolvedValue(''),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '{bad json' } }],
        }),
        text: vi.fn().mockResolvedValue(''),
      });

    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    process.env.AI_SERVICE_URL = 'http://localhost';
    process.env.AI_SERVICE_API_KEY = 'test-key';
    delete process.env.AI_MODEL;

    await import('../../../../backend/test-ai-connection.ts');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalled();
    expect(exitMock).not.toHaveBeenCalled();
  });

  it('covers request errors in conversation and knowledge tests', async () => {
    vi.resetModules();
    const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'OK' } }],
        }),
        text: vi.fn().mockResolvedValue(''),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('fail'),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('fail'),
      });

    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    process.env.AI_SERVICE_URL = 'http://localhost';
    process.env.AI_SERVICE_API_KEY = 'test-key';
    process.env.AI_MODEL = '';

    await import('../../../../backend/test-ai-connection.ts');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(exitMock).toHaveBeenCalledWith(1);
  });
});
