import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

async function setupAiMocks(page) {
  await mockApi(page, {
    handle: async (route, url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/ai/analyze')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { summary: '分析结果' } }),
        });
        return true;
      }
      if (pathname.endsWith('/ai/analysis')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
        return true;
      }
      if (pathname.includes('/sentiment')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, sentiment: { type: 'neutral' } }) });
        return true;
      }
      return false;
    },
  });
}

test.describe('AI 面板', () => {
  test('面板加载与对话切换刷新', async ({ page }) => {
    await seedAuth(page);
    await setupAiMocks(page);
    await page.goto('/app.html');

    await page.click('#ai-panel-toggle');
    await expect(page.locator('#ai-panel')).toBeVisible();
    await page.click('.conversation-item');
    await expect(page.locator('#ai-panel')).toContainText('分析结果');
  });

  test('采纳建议写入输入框', async ({ page }) => {
    await seedAuth(page);
    await setupAiMocks(page);
    await page.goto('/app.html');

    await page.click('#ai-panel-toggle');
    await page.click('[data-ai-action="accept"]');
    await expect(page.locator('#message-input')).toHaveValue(/.+/);
  });

  test('子区域切换', async ({ page }) => {
    await seedAuth(page);
    await setupAiMocks(page);
    await page.goto('/app.html');

    await page.click('#ai-panel-toggle');
    await page.click('[data-ai-tab="suggestions"]');
    await expect(page.locator('#ai-tab-suggestions')).toHaveClass(/active/);
    await page.click('[data-ai-tab="actions"]');
    await expect(page.locator('#ai-tab-actions')).toHaveClass(/active/);
  });
});
