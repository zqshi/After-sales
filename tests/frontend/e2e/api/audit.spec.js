import { test, expect } from '@playwright/test';
import { apiBaseUrl } from '../env.js';

test.describe('审计与监控 API', () => {
  test('POST /audit/events 写入事件', async ({ request }) => {
    const res = await request.post(`${apiBaseUrl}/audit/events`, {
      data: { action: 'POST', resource: 'conversation', detail: 'create', actor: 'test' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('GET /audit/reports/summary 返回汇总', async ({ request }) => {
    const res = await request.get(`${apiBaseUrl}/audit/reports/summary?days=7`);
    expect(res.ok()).toBeTruthy();
  });

  test('POST /monitoring/alerts 创建告警', async ({ request }) => {
    const res = await request.post(`${apiBaseUrl}/monitoring/alerts`, {
      data: { title: 'CPU High', level: 'warning' },
    });
    expect(res.ok()).toBeTruthy();
  });
});
