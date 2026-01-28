import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

const customer = {
  id: 'cust-001',
  name: '王小明',
  phone: '13800138000',
  level: 'VIP',
  risk: 'low',
};

const interactions = [
  { id: 'int-1', type: 'call', summary: '回访', createdAt: new Date().toISOString() },
  { id: 'int-2', type: 'chat', summary: '咨询', createdAt: new Date().toISOString() },
];

async function setupProfileMocks(page) {
  await mockApi(page, {
    handle: async (route, url) => {
      const { pathname } = new URL(url);
      if (pathname.startsWith('/api/customers/') && !pathname.endsWith('/interactions') && !pathname.endsWith('/refresh')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: customer }),
        });
        return true;
      }
      if (pathname.endsWith('/interactions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: interactions }),
        });
        return true;
      }
      if (pathname.endsWith('/refresh')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { refreshedAt: Date.now() } }),
        });
        return true;
      }
      return false;
    },
  });
}

test.describe('客户画像', () => {
  test('画像加载与缺省兜底', async ({ page }) => {
    await seedAuth(page);
    await setupProfileMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="messages"]');
    await expect(page.locator('#customer-profile-panel')).toBeVisible();
    await expect(page.locator('#customer-profile-name')).toContainText('王小明');
    await expect(page.locator('#customer-profile-level')).toContainText('VIP');
  });

  test('互动记录筛选与列表更新', async ({ page }) => {
    await seedAuth(page);
    await setupProfileMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="messages"]');
    await expect(page.locator('#customer-interactions-list')).toContainText('回访');
    await page.selectOption('#customer-interactions-filter', 'chat');
    await expect(page.locator('#customer-interactions-list')).toContainText('咨询');
  });

  test('刷新画像触发接口', async ({ page }) => {
    await seedAuth(page);
    await setupProfileMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="messages"]');
    await page.click('#customer-refresh-button');
    await expect(page.locator('#customer-refresh-toast')).toBeVisible();
  });
});
