import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

async function setupTaskMocks(page) {
  await mockApi(page, {
    handle: async (route, url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/api/tasks')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: [] } }),
        });
        return true;
      }
      if (pathname.includes('/api/tasks/') && pathname.endsWith('/actions')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        return true;
      }
      return false;
    },
  });
}

test.describe('任务与质检', () => {
  test('质检概览与空态', async ({ page }) => {
    await seedAuth(page);
    await setupTaskMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="messages"]');
    await page.click('[data-dock-parent="messages"][data-dock-subtab="tasks"]');
    await expect(page.locator('#quality-overview')).toBeVisible();
    await expect(page.locator('#tasks-empty-state')).toBeVisible();
  });

  test('指令派发与日志记录', async ({ page }) => {
    await seedAuth(page);
    await setupTaskMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="messages"]');
    await page.click('[data-dock-parent="messages"][data-dock-subtab="tasks"]');
    await page.click('#task-mode-command');
    await page.fill('#task-command-input', '检查对话质检');
    await page.click('#task-command-submit');
    await expect(page.locator('#task-command-log')).toContainText('检查对话质检');
  });

  test('空指令校验', async ({ page }) => {
    await seedAuth(page);
    await setupTaskMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="messages"]');
    await page.click('[data-dock-parent="messages"][data-dock-subtab="tasks"]');
    await page.click('#task-command-submit');
    await expect(page.locator('#task-command-warning')).toBeVisible();
  });
});
