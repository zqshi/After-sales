import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

async function setupPermissionPanelMocks(page) {
  await mockApi(page, {
    handle: async (route, url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/api/permission/members')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: [{ id: 'm1', name: '张三' }] } }),
        });
        return true;
      }
      if (pathname.endsWith('/api/permission/roles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: [{ id: 'r1', name: '管理员', system: true }] } }),
        });
        return true;
      }
      if (pathname.endsWith('/api/permission/save')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        return true;
      }
      return false;
    },
  });
}

test.describe('权限面板', () => {
  test('成员/角色加载与搜索', async ({ page }) => {
    await seedAuth(page, { user: { role: 'admin' } });
    await setupPermissionPanelMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="permissions"]');
    await expect(page.locator('#permission-member-list')).toContainText('张三');
    await page.fill('#permission-member-search', '张');
    await expect(page.locator('#permission-member-list')).toContainText('张三');
  });

  test('权限勾选与保存', async ({ page }) => {
    await seedAuth(page, { user: { role: 'admin' } });
    await setupPermissionPanelMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="permissions"]');
    await page.click('[data-permission-key="conversation.read"]');
    await page.click('#permission-save-button');
    await expect(page.locator('#permission-save-toast')).toBeVisible();
  });
});
