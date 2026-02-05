import { describe, it, expect, vi, afterEach } from 'vitest';
import { FeishuAdapter } from '@infrastructure/im/FeishuAdapter';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('FeishuAdapter', () => {
  it('returns disabled when adapter not enabled', async () => {
    const adapter = new FeishuAdapter({ appId: 'id', appSecret: 'secret', enabled: false });
    const result = await adapter.sendMessage('chat', { content: 'hi', messageType: 'text' });
    expect(result.success).toBe(false);
  });

  it('sends message with fetched token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ code: 0, tenant_access_token: 'token', expire: 7200 }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 0, data: { message_id: 'm1' } }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new FeishuAdapter({ appId: 'id', appSecret: 'secret' });
    const result = await adapter.sendMessage('chat', { content: 'hi', messageType: 'text' });
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('m1');
  });

  it('sends card message and reuses token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ code: 0, tenant_access_token: 'token', expire: 7200 }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 0, data: { message_id: 'm2' } }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 0, data: { message_id: 'm3' } }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new FeishuAdapter({ appId: 'id', appSecret: 'secret' });
    const result1 = await adapter.sendCard('chat', { title: 'card' });
    const result2 = await adapter.sendMessage('chat', { content: 'hi', messageType: 'text' });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('throws on token error and handles getUserInfo failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ code: 1, msg: 'bad' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new FeishuAdapter({ appId: 'id', appSecret: 'secret' });
    await expect(adapter.getUserInfo('u1')).rejects.toThrow('获取飞书access_token失败');
  });
});
