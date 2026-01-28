import { test, expect } from '@playwright/test';
import { apiBaseUrl, agentBaseUrl } from '../env.js';

test.describe('Agent 协同与智能辅助', () => {
  test('Orchestrator 路由决策', async ({ request }) => {
    const res = await request.post(`${agentBaseUrl}/orchestrator/route`, {
      data: { message: '我要退款', context: { channel: 'web' } },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('Assistant 分析建议', async ({ request }) => {
    const res = await request.post(`${apiBaseUrl}/ai/analyze`, {
      data: { conversationId: 'conv-1', content: '无法登录' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('Engineer 故障诊断', async ({ request }) => {
    const res = await request.post(`${agentBaseUrl}/engineer/diagnose`, {
      data: { symptom: '无法连接服务' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('Inspector 质检报告查询', async ({ request }) => {
    const res = await request.get(`${apiBaseUrl}/quality/conv-1`);
    expect(res.ok()).toBeTruthy();
  });
});
