import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers.js';

test.describe('工作台鉴权', () => {
  test('未登录访问 app.html 跳转登录页', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    });
    await page.goto('/app.html');
    await expect(page).toHaveURL(/index\.html/);
  });

  test('token 无效时跳转登录页', async ({ page }) => {
    await seedAuth(page);
    await page.route('**/api/**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'unauthorized' }),
      });
    });
    await page.goto('/app.html');
    await expect(page).toHaveURL(/index\.html/);
  });

  test('退出登录清理存储并跳转登录页', async ({ page }) => {
    await seedAuth(page);
    await page.route('**/api/**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'user-001',
            name: '测试用户',
            role: 'agent',
          },
        }),
      });
    });

    await page.goto('/app.html');
    await page.click('#user-menu-button');
    await page.click('#logout-button');

    await page.waitForURL('**/index.html');

    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    const user = await page.evaluate(() => localStorage.getItem('authUser'));
    expect(token).toBeNull();
    expect(user).toBeNull();
  });
});
