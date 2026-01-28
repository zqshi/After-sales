import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

const searchResults = [
  { id: 'k-1', title: '退款流程', category: '流程', score: 0.92 },
  { id: 'k-2', title: '发票开具', category: '财务', score: 0.88 },
];

async function setupKnowledgeApplyMocks(page) {
  await mockApi(page, {
    handle: async (route, url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/api/knowledge/search')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: searchResults } }),
        });
        return true;
      }
      if (pathname.startsWith('/api/knowledge/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { id: 'k-1', content: '退款步骤...' } }),
        });
        return true;
      }
      return false;
    },
  });
}

test.describe('知识应用', () => {
  test('搜索与预览', async ({ page }) => {
    await seedAuth(page);
    await setupKnowledgeApplyMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="knowledge"]');
    await page.click('[data-dock-parent="knowledge"][data-dock-subtab="apply"]');
    await page.fill('#knowledge-search-input', '退款');
    await page.click('#knowledge-search-button');
    await expect(page.locator('#knowledge-search-results')).toContainText('退款流程');
    await page.click('[data-knowledge-id="k-1"]');
    await expect(page.locator('#knowledge-preview')).toContainText('退款步骤');
  });

  test('复制内容提示', async ({ page }) => {
    await seedAuth(page);
    await setupKnowledgeApplyMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="knowledge"]');
    await page.click('[data-dock-parent="knowledge"][data-dock-subtab="apply"]');
    await page.fill('#knowledge-search-input', '发票');
    await page.click('#knowledge-search-button');
    await page.click('[data-knowledge-id="k-2"]');
    await page.click('#knowledge-copy-button');
    await expect(page.locator('#knowledge-copy-toast')).toBeVisible();
  });

  test('无结果空态与清空', async ({ page }) => {
    await seedAuth(page);
    await setupKnowledgeApplyMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="knowledge"]');
    await page.click('[data-dock-parent="knowledge"][data-dock-subtab="apply"]');
    await page.fill('#knowledge-search-input', '不存在');
    await page.click('#knowledge-search-button');
    await expect(page.locator('#knowledge-empty-state')).toBeVisible();
    await page.click('#knowledge-search-clear');
    await expect(page.locator('#knowledge-search-input')).toHaveValue('');
  });
});
