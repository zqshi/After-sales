import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers.js';

test.describe('可靠性与异常处理', () => {
  test('超时与重试提示', async ({ page }) => {
    await seedAuth(page);
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 504, contentType: 'application/json', body: JSON.stringify({ success: false }) });
    });
    await page.goto('/app.html');
    await expect(page.locator('#request-timeout-toast')).toBeVisible();
  });

  test('408 超时提示', async ({ page }) => {
    await seedAuth(page);
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 408, contentType: 'application/json', body: JSON.stringify({ success: false }) });
    });
    await page.goto('/app.html');
    await expect(page.locator('#request-timeout-toast')).toBeVisible();
  });

  test('断网降级提示', async ({ page }) => {
    await seedAuth(page);
    await page.route('**/api/**', async (route) => route.abort());
    await page.goto('/app.html');
    await expect(page.locator('#network-error')).toBeVisible();
  });

  test('429 限流提示', async ({ page }) => {
    await seedAuth(page);
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ success: false }) });
    });
    await page.goto('/app.html');
    await expect(page.locator('#rate-limit-toast')).toBeVisible();
  });
});
