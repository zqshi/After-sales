import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const makeResponse = ({ ok = true, status = 200, statusText = 'OK' }, body = '') => ({
  ok,
  status,
  statusText,
  text: vi.fn().mockResolvedValue(body),
});

const loadApi = async (config) => {
  vi.resetModules();
  window.config = config;
  return import('../api.js');
};

describe('api module', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete global.fetch;
    delete window.config;
  });

  it('throws when api base is not configured', async () => {
    const { isApiEnabled, fetchConversations } = await loadApi({});
    expect(isApiEnabled()).toBe(false);
    await expect(fetchConversations({})).rejects.toThrow('API not configured');
  });

  it('builds query params and headers', async () => {
    const { fetchConversations } = await loadApi({ apiBaseUrl: 'https://api.example.com/', authToken: 't1' });

    global.fetch.mockResolvedValueOnce(
      makeResponse({ ok: true, status: 200 }, JSON.stringify({ items: [] })),
    );

    await fetchConversations({ a: 1, b: '', c: null, d: 'x y' });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/im/conversations?a=1&d=x%20y');
    expect(options.headers.Authorization).toBe('Bearer t1');
    expect(options.headers['Content-Type']).toBeUndefined();
  });

  it('removes content-type when sending form data', async () => {
    const { uploadKnowledgeDocument } = await loadApi({ apiBaseUrl: 'https://api.example.com' });

    global.fetch.mockResolvedValueOnce(
      makeResponse({ ok: true, status: 200 }, JSON.stringify({ ok: true })),
    );

    const formData = new FormData();
    formData.append('file', new Blob(['data']), 'file.txt');

    await uploadKnowledgeDocument(formData);

    const [, options] = global.fetch.mock.calls[0];
    expect(options.body).toBe(formData);
    expect(options.headers['Content-Type']).toBeUndefined();
  });

  it('retries on retryable status and succeeds', async () => {
    const { fetchConversationStats } = await loadApi({ apiBaseUrl: 'https://api.example.com' });

    global.fetch
      .mockResolvedValueOnce(makeResponse({ ok: false, status: 500 }, JSON.stringify({ error: 'x' })))
      .mockResolvedValueOnce(makeResponse({ ok: false, status: 502 }, JSON.stringify({ error: 'y' })))
      .mockResolvedValueOnce(makeResponse({ ok: true, status: 200 }, JSON.stringify({ ok: true })));

    const promise = fetchConversationStats({});
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('retries on network error and throws after max retries', async () => {
    const { fetchRoles } = await loadApi({ apiBaseUrl: 'https://api.example.com' });

    global.fetch.mockRejectedValue(new Error('network'));

    const promise = fetchRoles();
    const assertion = expect(promise).rejects.toThrow('Network request failed: network');
    await vi.runAllTimersAsync();
    await assertion;
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('throws on invalid json response', async () => {
    const { fetchMembers } = await loadApi({ apiBaseUrl: 'https://api.example.com' });

    global.fetch.mockResolvedValueOnce(makeResponse({ ok: true, status: 200 }, '<html>bad</html>'));

    await expect(fetchMembers()).rejects.toThrow('Invalid JSON response');
  });

  it('uses server error message for non-ok response', async () => {
    const { fetchCurrentUser } = await loadApi({ apiBaseUrl: 'https://api.example.com' });

    global.fetch.mockResolvedValueOnce(
      makeResponse({ ok: false, status: 400, statusText: 'Bad Request' }, JSON.stringify({ error: { message: 'bad' } })),
    );

    await expect(fetchCurrentUser()).rejects.toMatchObject({ message: 'bad', status: 400 });
  });
});
