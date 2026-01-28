import { test, expect } from '@playwright/test';
import { apiBaseUrl } from '../env.js';

test.describe('实时通信与 SSE', () => {
  test('SSE 连接返回 event-stream', async ({ request }) => {
    const res = await request.get(`${apiBaseUrl}/im/reviews/stream`);
    expect(res.ok()).toBeTruthy();
    const contentType = res.headers()['content-type'] || '';
    expect(contentType).toContain('text/event-stream');
  });

  test('待复核列表可查询', async ({ request }) => {
    const res = await request.get(`${apiBaseUrl}/im/reviews/pending`);
    expect(res.ok()).toBeTruthy();
  });
});
