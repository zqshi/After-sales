import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

async function setupRuntimeMocks(page) {
  await page.route('**/runtime-config.js', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'window.RUNTIME_CONFIG={API_BASE:\"/api\"};',
    });
  });
  await mockApi(page);
}

test.describe('运行时配置', () => {
  test('runtime-config 覆盖 API 地址', async ({ page }) => {
    await seedAuth(page);
    await setupRuntimeMocks(page);
    await page.goto('/app.html');

    const apiBase = await page.evaluate(() => window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE);
    expect(apiBase).toBe('/api');
  });

  test('缺省配置提示', async ({ page }) => {
    await seedAuth(page);
    await mockApi(page);
    await page.goto('/app.html');

    await expect(page.locator('#runtime-config-warning')).toBeVisible();
  });
});
