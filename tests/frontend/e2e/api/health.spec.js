import { test, expect } from '@playwright/test';
import { apiBaseUrl } from '../env.js';

test.describe('健康检查 API', () => {
  test('GET /health 返回 healthy', async ({ request }) => {
    const res = await request.get(`${apiBaseUrl}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('healthy');
  });

  test('GET /metrics 返回 text/plain', async ({ request }) => {
    const res = await request.get(`${apiBaseUrl}/metrics`);
    expect(res.ok()).toBeTruthy();
    const contentType = res.headers()['content-type'] || '';
    expect(contentType).toContain('text/plain');
  });
});
