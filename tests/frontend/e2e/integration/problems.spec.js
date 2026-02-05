import { test, expect } from '@playwright/test';
import { apiBaseUrl } from '../env.js';

test.describe('问题并行管理', () => {
  test('创建问题记录', async ({ request }) => {
    const res = await request.post(`${apiBaseUrl}/problems`, {
      data: { conversationId: 'conv-1', title: '无法登录', priority: 'high' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('问题状态流转', async ({ request }) => {
    const res = await request.patch(`${apiBaseUrl}/problems/prob-1/status`, {
      data: { status: 'in_progress' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('问题与工单关联', async ({ request }) => {
    const res = await request.post(`${apiBaseUrl}/problems/prob-1/ticket`, {
      data: { ticketId: 'ticket-1' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test.skip('问题关闭/归档（P0 缺口骨架）', async ({ request }) => {
    // TODO: 补齐接口路径、状态流转与断言
    const res = await request.post(`${apiBaseUrl}/problems/prob-1/close`, {
      data: { reason: 'resolved' },
    });
    expect(res.ok()).toBeTruthy();
  });
});
