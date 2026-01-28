import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

async function setupQuickMocks(page) {
  await mockApi(page, {
    handle: async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      return true;
    },
  });
}

test.describe('工具箱快捷动作', () => {
  test('系统通知/工单/升级问题提交', async ({ page }) => {
    await seedAuth(page);
    await setupQuickMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="tools"]');
    await page.click('#quick-action-notice');
    await page.fill('#quick-notice-content', '系统通知');
    await page.click('#quick-notice-submit');
    await expect(page.locator('#quick-notice-toast')).toBeVisible();

    await page.click('#quick-action-ticket');
    await page.fill('#quick-ticket-title', '工单标题');
    await page.click('#quick-ticket-submit');
    await expect(page.locator('#quick-ticket-toast')).toBeVisible();

    await page.click('#quick-action-escalate');
    await page.fill('#quick-escalate-content', '升级原因');
    await page.click('#quick-escalate-submit');
    await expect(page.locator('#quick-escalate-toast')).toBeVisible();
  });

  test('弹窗 ESC 关闭', async ({ page }) => {
    await seedAuth(page);
    await setupQuickMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="tools"]');
    await page.click('#quick-action-notice');
    await page.keyboard.press('Escape');
    await expect(page.locator('#quick-notice-modal')).toBeHidden();
  });
});
