import { test, expect } from '@playwright/test';
import { apiBaseUrl } from '../env.js';

test.describe('事件溯源与一致性', () => {
  test('domain_events 与 outbox_events 写入', async ({ request }) => {
    const res = await request.post(`${apiBaseUrl}/events/test-write`, {
      data: { type: 'MessageSent', aggregateId: 'conv-1' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('事件一致性校验', async ({ request }) => {
    const res = await request.get(`${apiBaseUrl}/events/consistency`);
    expect(res.ok()).toBeTruthy();
  });

  test('事件回溯与重放', async ({ request }) => {
    const res = await request.get(`${apiBaseUrl}/events/replay?aggregateId=conv-1`);
    expect(res.ok()).toBeTruthy();
  });
});
