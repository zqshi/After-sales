import { test, expect } from '@playwright/test';

test.describe('登录校验', () => {
  test('账号为空提示错误', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('button', { name: '进入工作台' }).click();
    await expect(page.locator('#username-error')).toHaveText('请输入账号。');
  });

  test('账号格式错误提示', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#username', 'invalid');
    await page.fill('#password', 'Admin1234');
    await page.getByRole('button', { name: '进入工作台' }).click();
    await expect(page.locator('#username-error')).toHaveText('账号格式需为邮箱或手机号。');
  });

  test('密码过短提示', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#username', 'test@example.com');
    await page.fill('#password', 'Abc123');
    await page.getByRole('button', { name: '进入工作台' }).click();
    await expect(page.locator('#password-error'))
      .toHaveText('密码至少 8 位，需包含大小写字母与数字。');
  });

  test('密码缺少大小写或数字提示', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#username', 'test@example.com');
    await page.fill('#password', 'abcdefgh');
    await page.getByRole('button', { name: '进入工作台' }).click();
    await expect(page.locator('#password-error'))
      .toHaveText('密码需包含大小写字母与数字。');
  });

  test('一键填入测试账号', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('button', { name: '一键填入测试账号' }).click();
    await expect(page.locator('#username')).toHaveValue('admin@kingsoft.com');
    await expect(page.locator('#password')).toHaveValue('Admin123456');
  });

  test('登录失败提示后端错误', async ({ page }) => {
    await page.route('**/api/**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: '账号或密码错误' }),
      });
    });
    await page.goto('/index.html');
    await page.fill('#username', 'test@example.com');
    await page.fill('#password', 'Admin1234');
    await page.getByRole('button', { name: '进入工作台' }).click();
    await expect(page.locator('#login-error')).toHaveText('账号或密码错误');
  });
});
