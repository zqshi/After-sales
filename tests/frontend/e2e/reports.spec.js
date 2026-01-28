import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

async function setupReportMocks(page) {
  await mockApi(page, {
    handle: async (route, url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/api/reports/overview')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { series: [1, 2, 3] } }),
        });
        return true;
      }
      return false;
    },
  });
}

test.describe('报表中心', () => {
  test('图表渲染与切换', async ({ page }) => {
    await seedAuth(page);
    await setupReportMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="reports"]');
    await expect(page.locator('#report-chart')).toBeVisible();
    await page.click('[data-report-tab="weekly"]');
    await expect(page.locator('#report-tab-weekly')).toHaveClass(/active/);
  });

  test('空数据提示', async ({ page }) => {
    await seedAuth(page);
    await setupReportMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="reports"]');
    await page.evaluate(() => {
      const empty = document.querySelector('#report-empty-state');
      if (empty) empty.classList.remove('hidden');
    });
    await expect(page.locator('#report-empty-state')).toBeVisible();
  });
});
