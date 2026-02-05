import { describe, it, expect, vi, afterEach } from 'vitest';

const loadClient = async (env: Record<string, string>) => {
  vi.resetModules();
  Object.entries(env).forEach(([key, value]) => {
    vi.stubEnv(key, value);
  });
  const mod = await import('@infrastructure/ai/LLMClient');
  return mod.LLMClient;
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('LLMClient', () => {
  it('should report disabled when config missing', async () => {
    const LLMClient = await loadClient({
      AI_SERVICE_URL: '',
      AI_SERVICE_API_KEY: '',
      AI_SERVICE_PROVIDER: 'openai',
    });
    const client = new LLMClient();
    expect(client.isEnabled()).toBe(false);
    await expect(client.generate([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      'LLM服务未启用或配置不完整',
    );
  });

  it('should generate reply for openai provider', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
      AI_MODEL: 'gpt-test',
    });

    const client = new LLMClient();
    const result = await client.generate([{ role: 'user', content: 'hello' }]);
    expect(result).toBe('ok');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('should generate reply for anthropic provider', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: 'anthropic-ok' }],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'anthropic',
      AI_MODEL: 'claude-test',
    });

    const client = new LLMClient();
    const result = await client.generate([{ role: 'user', content: 'hello' }]);
    expect(result).toBe('anthropic-ok');
  });

  it('should throw error on non-200 response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => 'oops',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
    });

    const client = new LLMClient();
    await expect(client.generate([{ role: 'user', content: 'hello' }])).rejects.toThrow(
      'LLM API调用失败',
    );
  });

  it('should fallback to default sentiment when response invalid', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'no-json-here' } }],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
    });

    const client = new LLMClient();
    const result = await client.analyzeSentiment('bad');
    expect(result.overallSentiment).toBe('neutral');
    expect(result.confidence).toBe(0.5);
  });

  it('throws when analyzeSentiment called while disabled', async () => {
    const LLMClient = await loadClient({
      AI_SERVICE_URL: '',
      AI_SERVICE_API_KEY: '',
      AI_SERVICE_PROVIDER: 'openai',
    });
    const client = new LLMClient();
    await expect(client.analyzeSentiment('hi')).rejects.toThrow('LLM服务未启用或配置不完整');
  });

  it('throws when extractIntent called while disabled', async () => {
    const LLMClient = await loadClient({
      AI_SERVICE_URL: '',
      AI_SERVICE_API_KEY: '',
      AI_SERVICE_PROVIDER: 'openai',
    });
    const client = new LLMClient();
    await expect(client.extractIntent('hi')).rejects.toThrow('LLM服务未启用或配置不完整');
  });

  it('throws when generateReply called while disabled', async () => {
    const LLMClient = await loadClient({
      AI_SERVICE_URL: '',
      AI_SERVICE_API_KEY: '',
      AI_SERVICE_PROVIDER: 'openai',
    });
    const client = new LLMClient();
    await expect(client.generateReply('hi', {
      overallSentiment: 'neutral',
      score: 0.5,
      confidence: 0.5,
      emotions: [],
      reasoning: 'x',
    }, [])).rejects.toThrow('LLM服务未启用或配置不完整');
  });

  it('should default sentiment fields when response missing values', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{}' } }],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
    });

    const client = new LLMClient();
    const result = await client.analyzeSentiment('hello');
    expect(result.overallSentiment).toBe('neutral');
    expect(result.score).toBe(0.5);
    expect(result.confidence).toBe(0.8);
    expect(result.reasoning).toBe('无法解析分析理由');
  });

  it('should timeout when request exceeds limit', async () => {
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

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
      AI_SERVICE_TIMEOUT: '5',
    });

    const client = new LLMClient();
    const promise = client.generate([{ role: 'user', content: 'slow' }]);
    const expectation = expect(promise).rejects.toThrow('LLM API调用超时');

    await vi.advanceTimersByTimeAsync(5);
    await expectation;
  });

  it('should parse intent response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"isQuestion":true,"intent":"complaint","keywords":["k"],"entities":{"id":"1"},"confidence":0.9}' } }],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
    });

    const client = new LLMClient();
    const result = await client.extractIntent('hello');
    expect(result.intent).toBe('complaint');
    expect(result.isQuestion).toBe(true);
  });

  it('should parse intent with history and fallback fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{}' } }],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
    });

    const client = new LLMClient();
    const result = await client.extractIntent('hello', [
      { role: 'customer', content: 'prev' },
    ]);
    expect(result.intent).toBe('inquiry');
    expect(result.keywords).toEqual([]);
    expect(result.confidence).toBe(0.7);
  });

  it('should fallback reply when response invalid', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'no-json' } }] }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
    });

    const client = new LLMClient();
    const result = await client.generateReply('hi', {
      overallSentiment: 'neutral',
      score: 0.5,
      confidence: 0.5,
      emotions: [],
      reasoning: 'test',
    }, [{ title: 'KB', url: 'http://x' }]);
    expect(result.suggestedReply).toContain('抱歉');
  });

  it('should build reply with history and knowledge content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{}' } }],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
    });

    const client = new LLMClient();
    const result = await client.generateReply('hi', {
      overallSentiment: 'neutral',
      score: 0.5,
      confidence: 0.5,
      emotions: ['ok'],
      reasoning: 'test',
    }, [{
      title: 'KB',
      url: 'http://x',
      content: 'content',
    }], [
      { role: 'assistant', content: 'prev' },
    ]);
    expect(result.suggestedReply).toBe('无法生成回复建议');
  });

  it('uses default timeout when configured as zero', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
      AI_SERVICE_TIMEOUT: '0',
    });

    const client = new LLMClient();
    const result = await client.generate([{ role: 'user', content: 'hello' }]);
    expect(result).toBe('ok');
  });

  it('handles anthropic requests without system message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'anthropic-no-system' }] }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'anthropic',
      AI_MODEL: 'claude-test',
    });

    const client = new LLMClient();
    const result = await client.generate([{ role: 'user', content: 'hello' }]);
    expect(result).toBe('anthropic-no-system');
  });

  it('should use default provider format when provider unknown', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok-default' } }] }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'qwen',
      AI_MODEL: 'qwen-test',
    });

    const client = new LLMClient();
    const result = await client.generate([{ role: 'user', content: 'hello' }]);
    expect(result).toBe('ok-default');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/chat/completions'),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('should fallback to default intent when response invalid', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'no-json' } }],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
    });

    const client = new LLMClient();
    const result = await client.extractIntent('hello');
    expect(result.intent).toBe('inquiry');
    expect(result.confidence).toBe(0.5);
  });

  it('should parse sentiment response with history', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"overallSentiment":"positive","score":"0.9","confidence":"0.8","emotions":"happy","reasoning":"ok"}',
            },
          },
        ],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
    });

    const client = new LLMClient();
    const result = await client.analyzeSentiment('hello', [
      { role: 'customer', content: 'history' },
    ]);
    expect(result.overallSentiment).toBe('positive');
    expect(result.emotions).toEqual([]);
  });

  it('should generate reply without knowledge items', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"suggestedReply":"ok","confidence":0.8,"reasoning":"ok"}',
            },
          },
        ],
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const LLMClient = await loadClient({
      AI_SERVICE_URL: 'https://api.example.com',
      AI_SERVICE_API_KEY: 'key',
      AI_SERVICE_PROVIDER: 'openai',
    });

    const client = new LLMClient();
    const result = await client.generateReply('hi', {
      overallSentiment: 'neutral',
      score: 0.5,
      confidence: 0.5,
      emotions: [],
      reasoning: 'test',
    }, []);
    expect(result.suggestedReply).toBe('ok');
    expect(result.confidence).toBe(0.8);
  });
});
