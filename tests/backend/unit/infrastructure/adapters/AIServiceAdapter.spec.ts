import { describe, it, expect, vi, afterEach } from 'vitest';

const loadAdapter = async (env: Record<string, string>) => {
  vi.resetModules();
  Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value));
  const mod = await import('@infrastructure/adapters/AIServiceAdapter');
  return mod;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('AIServiceAdapter', () => {
  it('throws when service disabled', async () => {
    const { AIServiceAdapter } = await loadAdapter({
      AI_SERVICE_URL: '',
      AI_SERVICE_API_KEY: '',
    });
    const adapter = new AIServiceAdapter();
    await expect(adapter.analyzeConversation({ conversationId: 'c1' })).rejects.toThrow(
      'AI service is not enabled',
    );
  });

  it('analyzes conversation and parses JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '{"summary":"ok","sentiment":"positive","score":0.9,"confidence":0.8,"issues":[],"suggestions":[]}',
            },
          },
        ],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const { AIServiceAdapter } = await loadAdapter({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_MODEL: 'model',
    });

    const adapter = new AIServiceAdapter();
    const result = await adapter.analyzeConversation({
      conversationId: 'c1',
      context: 'ctx',
      keywords: ['k1'],
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.sentiment).toBe('positive');
  });

  it('recommends knowledge and handles invalid JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'invalid-json' } }],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const { AIServiceAdapter } = await loadAdapter({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_MODEL: 'model',
    });

    const adapter = new AIServiceAdapter();
    const result = await adapter.recommendKnowledge({ query: 'q1' });
    expect(result.recommendations.length).toBe(0);
  });

  it('retries on timeout and then fails', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn((_: string, options?: { signal?: AbortSignal }) =>
      new Promise((_, reject) => {
        const signal = options?.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            const error = new Error('aborted');
            (error as Error & { name?: string }).name = 'AbortError';
            reject(error);
          });
        }
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { AIServiceAdapter, AIServiceError } = await loadAdapter({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_TIMEOUT: '5',
      AI_SERVICE_MAX_RETRIES: '1',
    });

    const adapter = new AIServiceAdapter();
    const promise = adapter.analyzeConversation({ conversationId: 'c1' });
    const expectation = expect(promise).rejects.toBeInstanceOf(AIServiceError);

    await vi.advanceTimersByTimeAsync(5);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(5);

    await expectation;
  });

  it('throws when response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'error',
    });
    vi.stubGlobal('fetch', fetchMock);

    const { AIServiceAdapter, AIServiceError } = await loadAdapter({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
    });

    const adapter = new AIServiceAdapter();
    await expect(adapter.analyzeConversation({ conversationId: 'c1' })).rejects.toBeInstanceOf(AIServiceError);
  });

  it('throws when response has no choices', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const { AIServiceAdapter, AIServiceError } = await loadAdapter({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
    });

    const adapter = new AIServiceAdapter();
    await expect(adapter.analyzeConversation({ conversationId: 'c1' })).rejects.toBeInstanceOf(AIServiceError);
  });

  it('falls back when analyze response is invalid JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'invalid-json' } }],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const { AIServiceAdapter } = await loadAdapter({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
    });

    const adapter = new AIServiceAdapter();
    const result = await adapter.analyzeConversation({ conversationId: 'c1' });
    expect(result.summary).toContain('invalid-json');
  });

  it('parses recommend response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"recommendations":[{\"title\":\"T\",\"content\":\"C\",\"relevance\":0.9}]}' } }],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const { AIServiceAdapter } = await loadAdapter({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
    });

    const adapter = new AIServiceAdapter();
    const result = await adapter.recommendKnowledge({ query: 'q1' });
    expect(result.recommendations.length).toBe(1);
  });
});
