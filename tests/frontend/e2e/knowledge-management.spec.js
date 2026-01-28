import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

async function setupKnowledgeManagementMocks(page) {
  await mockApi(page, {
    handle: async (route, url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/api/knowledge')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: [] } }),
        });
        return true;
      }
      if (pathname.endsWith('/api/knowledge/search')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: [{ id: 'doc-1', title: '安装指引' }] } }),
        });
        return true;
      }
      if (pathname.endsWith('/api/knowledge/upload')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        return true;
      }
      if (pathname.endsWith('/api/knowledge/categories')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: [{ id: 'cat-1', name: '默认分类' }] } }),
        });
        return true;
      }
      return false;
    },
  });
}

test.describe('知识库管理扩展', () => {
  test('搜索与排序', async ({ page }) => {
    await seedAuth(page);
    await setupKnowledgeManagementMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="knowledge"]');
    await page.fill('#knowledge-search-input', '安装');
    await page.click('#knowledge-search-button');
    await expect(page.locator('#knowledge-doc-list')).toContainText('安装指引');
    await page.selectOption('#knowledge-sort', 'updatedAt');
  });

  test('上传文档与进度', async ({ page }) => {
    await seedAuth(page);
    await setupKnowledgeManagementMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="knowledge"]');
    const fileInput = page.locator('#knowledge-upload-input');
    await fileInput.setInputFiles({ name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('test') });
    await expect(page.locator('#knowledge-upload-progress')).toBeVisible();
  });

  test('分类新增与删除', async ({ page }) => {
    await seedAuth(page);
    await setupKnowledgeManagementMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="knowledge"]');
    await page.click('#knowledge-category-add');
    await page.fill('#knowledge-category-name', '新分类');
    await page.click('#knowledge-category-save');
    await expect(page.locator('#knowledge-category-tree')).toContainText('新分类');
  });
});
