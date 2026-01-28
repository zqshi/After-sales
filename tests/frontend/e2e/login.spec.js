import { test, expect } from '@playwright/test';

test.describe('登录页面', () => {
  test('空表单提交提示错误', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('button', { name: '进入工作台' }).click();

    await expect(page.locator('#username-error')).toBeVisible();
    await expect(page.locator('#password-error')).toBeVisible();
  });

  test('登录成功跳转到工作台', async ({ page }) => {
    await page.route('**/api/**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'test-token',
            user: {
              id: 'user-001',
              name: '测试用户',
              role: 'agent',
            },
          },
        }),
      });
    });
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

    await page.goto('/index.html');
    await page.fill('#username', 'test@example.com');
    await page.fill('#password', 'Test123456');
    await page.getByRole('button', { name: '进入工作台' }).click();

    await page.waitForURL('**/app.html');
    await expect(page.locator('#user-display-name')).toContainText('测试用户');
  });
});
