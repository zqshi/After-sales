import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

const requirements = [
  { id: 'req-1', title: '新增导出功能', status: 'pending', priority: 'high' },
  { id: 'req-2', title: '修复登录问题', status: 'approved', priority: 'medium' },
];

async function setupRequirementMocks(page) {
  await mockApi(page, {
    handle: async (route, url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/api/requirements')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: requirements } }),
        });
        return true;
      }
      if (pathname.endsWith('/api/requirements/statistics')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { total: 2, pending: 1, approved: 1 } }),
        });
        return true;
      }
      if (pathname.endsWith('/ignore')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        return true;
      }
      if (pathname.endsWith('/status')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        return true;
      }
      return false;
    },
  });
}

test.describe('需求管理', () => {
  test('需求列表与统计卡加载', async ({ page }) => {
    await seedAuth(page);
    await setupRequirementMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="messages"]');
    await page.click('[data-dock-parent="messages"][data-dock-subtab="requirements"]');
    await expect(page.locator('#requirements-stats')).toContainText('2');
    await expect(page.locator('#requirements-list')).toContainText('新增导出功能');
  });

  test('状态筛选与空态', async ({ page }) => {
    await seedAuth(page);
    await setupRequirementMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="messages"]');
    await page.click('[data-dock-parent="messages"][data-dock-subtab="requirements"]');
    await page.selectOption('#requirements-status-filter', 'approved');
    await expect(page.locator('#requirements-list')).toContainText('修复登录问题');
  });

  test('创建/忽略需求按钮可用', async ({ page }) => {
    await seedAuth(page);
    await setupRequirementMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="messages"]');
    await page.click('[data-dock-parent="messages"][data-dock-subtab="requirements"]');
    await page.click('[data-requirement-action="create"]');
    await page.click('[data-requirement-action="ignore"]');
    await expect(page.locator('#requirements-toast')).toBeVisible();
  });
});
