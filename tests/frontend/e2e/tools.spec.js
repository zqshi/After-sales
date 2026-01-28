import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

async function setupToolMocks(page) {
  await mockApi(page, {
    handle: async (route, url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/monitoring/alerts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: [{ id: 'alert-1', level: 'warning' }] } }),
        });
        return true;
      }
      if (pathname.includes('/monitoring/alerts/') && pathname.endsWith('/resolve')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        return true;
      }
      if (pathname.endsWith('/audit/reports/summary')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { total: 10 } }) });
        return true;
      }
      return false;
    },
  });
}

test.describe('工具箱', () => {
  test('服务状态监控与告警处理', async ({ page }) => {
    await seedAuth(page);
    await setupToolMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="tools"]');
    await page.click('#tool-service-monitor');
    await expect(page.locator('#alert-list')).toContainText('warning');
    await page.click('[data-alert-action="resolve"]');
    await expect(page.locator('#alert-toast')).toBeVisible();
  });

  test('生成报告展示审计汇总', async ({ page }) => {
    await seedAuth(page);
    await setupToolMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="tools"]');
    await page.click('#tool-generate-report');
    await expect(page.locator('#audit-summary')).toContainText('10');
  });

  test('诊断/日志/会话弹窗', async ({ page }) => {
    await seedAuth(page);
    await setupToolMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="tools"]');
    await page.click('#tool-login-diagnosis');
    await expect(page.locator('#diagnosis-modal')).toBeVisible();
    await page.click('#tool-query-logs');
    await expect(page.locator('#logs-modal')).toBeVisible();
    await page.click('#tool-session-manager');
    await expect(page.locator('#session-modal')).toBeVisible();
  });
});
