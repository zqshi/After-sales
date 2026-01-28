import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

const conversations = [
  {
    conversationId: 'conv-1',
    customerId: 'cust-1',
    customerName: '张三',
    channel: 'wecom',
    summary: '无法登录系统',
    urgency: 'high',
    slaLevel: 'vip',
    status: 'pending',
    updatedAt: new Date().toISOString(),
  },
  {
    conversationId: 'conv-2',
    customerId: 'cust-2',
    customerName: '李四',
    channel: 'feishu',
    summary: '需求咨询',
    urgency: 'normal',
    slaLevel: 'ka1',
    status: 'active',
    updatedAt: new Date().toISOString(),
  },
];

async function setupConversationMocks(page, options = {}) {
  await mockApi(page, {
    handle: async (route, url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/im/conversations')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: conversations } }),
        });
        return true;
      }
      if (pathname.endsWith('/im/conversations/stats')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { statusCounts: { all: 2, pending: 1, active: 1 } } }),
        });
        return true;
      }
      if (pathname.includes('/im/conversations/') && pathname.endsWith('/messages')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: [] } }),
        });
        return true;
      }
      if (pathname.includes('/im/conversations/') && pathname.endsWith('/sentiment')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, sentiment: { type: 'positive', label: '积极' } }),
        });
        return true;
      }
      if (pathname.includes('/im/conversations/') && pathname.endsWith('/ai-analysis')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {} }),
        });
        return true;
      }
      if (pathname.endsWith('/im/incoming-message')) {
        if (typeof options.onSendMessage === 'function') {
          options.onSendMessage();
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { message: {} } }),
        });
        return true;
      }
      if (pathname.endsWith('/im/conversations/conv-1/mode') || pathname.endsWith('/im/conversations/conv-2/mode')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
        return true;
      }
      if (pathname.startsWith('/api/customers/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'cust-1',
              name: '张三',
              company: '测试公司',
              level: 'VIP',
            },
          }),
        });
        return true;
      }
      if (pathname.includes('/interactions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
        return true;
      }
      return false;
    },
  });
}

test.describe('对话列表与会话', () => {
  test('列表加载并默认选中第一项', async ({ page }) => {
    await seedAuth(page);
    await setupConversationMocks(page);
    await page.goto('/app.html');

    const items = page.locator('.conversation-item');
    await expect(items).toHaveCount(2);
    await expect(items.first()).toHaveClass(/is-active/);
    await expect(page.locator('#chat-header-title')).toContainText('张三');
  });

  test('切换对话更新标题', async ({ page }) => {
    await seedAuth(page);
    await setupConversationMocks(page);
    await page.goto('/app.html');

    await page.locator('.conversation-item').nth(1).click();
    await expect(page.locator('#chat-header-title')).toContainText('李四');
  });

  test('搜索与无结果提示', async ({ page }) => {
    await seedAuth(page);
    await setupConversationMocks(page);
    await page.goto('/app.html');

    await page.fill('#conversation-search-input', '不存在');
    await expect(page.locator('.no-results-message')).toBeVisible();

    await page.fill('#conversation-search-input', '');
    await expect(page.locator('.no-results-message')).toBeHidden();
  });

  test('筛选条件生效', async ({ page }) => {
    await seedAuth(page);
    await setupConversationMocks(page);
    await page.goto('/app.html');

    await page.selectOption('#filter-channel', 'wecom');
    const conv1 = page.locator('.conversation-item[data-id="conv-1"]');
    const conv2 = page.locator('.conversation-item[data-id="conv-2"]');
    await expect(conv1).toBeVisible();
    await expect(conv2).toBeHidden();
  });

  test('紧急度筛选生效', async ({ page }) => {
    await seedAuth(page);
    await setupConversationMocks(page);
    await page.goto('/app.html');

    await page.selectOption('#filter-urgency', 'high');
    const conv1 = page.locator('.conversation-item[data-id="conv-1"]');
    const conv2 = page.locator('.conversation-item[data-id="conv-2"]');
    await expect(conv1).toBeVisible();
    await expect(conv2).toBeHidden();
  });

  test('客户等级筛选生效', async ({ page }) => {
    await seedAuth(page);
    await setupConversationMocks(page);
    await page.goto('/app.html');

    await page.selectOption('#filter-sla', 'ka1');
    const conv1 = page.locator('.conversation-item[data-id="conv-1"]');
    const conv2 = page.locator('.conversation-item[data-id="conv-2"]');
    await expect(conv1).toBeHidden();
    await expect(conv2).toBeVisible();
  });

  test('状态筛选按钮生效', async ({ page }) => {
    await seedAuth(page);
    await setupConversationMocks(page);
    await page.goto('/app.html');

    await page.click('#filter-status-pending');
    const conv1 = page.locator('.conversation-item[data-id="conv-1"]');
    const conv2 = page.locator('.conversation-item[data-id="conv-2"]');
    await expect(conv1).toBeVisible();
    await expect(conv2).toBeHidden();

    await page.click('#filter-status-active');
    await expect(conv1).toBeHidden();
    await expect(conv2).toBeVisible();
  });

  test('输入包含优惠词时提示低置信', async ({ page }) => {
    await seedAuth(page);
    await setupConversationMocks(page);
    await page.goto('/app.html');

    await page.fill('#message-input', '可以赠送优惠吗');
    await expect(page.locator('#low-confidence-warning')).toBeVisible();
  });

  test('表情面板开关', async ({ page }) => {
    await seedAuth(page);
    await setupConversationMocks(page);
    await page.goto('/app.html');

    await page.click('#emoji-button');
    await expect(page.locator('#emoji-panel')).toBeVisible();
    await page.click('body');
    await expect(page.locator('#emoji-panel')).toBeHidden();
  });

  test('模式切换按钮高亮', async ({ page }) => {
    await seedAuth(page);
    await setupConversationMocks(page);
    await page.goto('/app.html');

    await page.click('[data-chat-mode="human_first"]');
    await expect(page.locator('[data-chat-mode="human_first"]')).toHaveClass(/active/);
  });

  test('发送消息追加到聊天区', async ({ page }) => {
    await seedAuth(page);
    await setupConversationMocks(page);
    await page.goto('/app.html');

    await page.fill('#message-input', '你好');
    await page.click('#send-button');
    await expect(page.locator('#chat-messages')).toContainText('你好');
  });

  test('空消息不触发发送', async ({ page }) => {
    let sendCalls = 0;
    await seedAuth(page);
    await setupConversationMocks(page, { onSendMessage: () => { sendCalls += 1; } });
    await page.goto('/app.html');

    await page.fill('#message-input', '');
    await page.click('#send-button');
    await page.waitForTimeout(200);
    expect(sendCalls).toBe(0);
  });
});
