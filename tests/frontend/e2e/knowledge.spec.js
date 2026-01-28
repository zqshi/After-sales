import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

const knowledgeItems = [
  {
    id: 'doc-1',
    title: '安装指引',
    category: 'guide',
    status: 'active',
    summary: '快速安装步骤',
    updatedAt: new Date().toISOString(),
    tags: ['安装'],
    metadata: { owner: '客服' },
  },
  {
    id: 'faq-1',
    title: '如何重置密码？',
    category: 'faq',
    status: 'active',
    summary: '重置步骤',
    updatedAt: new Date().toISOString(),
    tags: ['账号'],
    metadata: { answer: '通过忘记密码入口' },
  },
];

async function setupKnowledgeMocks(page) {
  await mockApi(page, {
    handle: async (route, url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/api/knowledge')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: knowledgeItems } }),
        });
        return true;
      }
      if (pathname.endsWith('/api/auth/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'user-001', name: '测试用户', role: 'agent' },
          }),
        });
        return true;
      }
      return false;
    },
  });
}

test.describe('知识库管理', () => {
  test('文档列表渲染', async ({ page }) => {
    await seedAuth(page);
    await setupKnowledgeMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="knowledge"]');
    await expect(page.locator('#knowledge-doc-list')).toContainText('安装指引');
  });

  test('FAQ 切换与渲染', async ({ page }) => {
    await seedAuth(page);
    await setupKnowledgeMocks(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="knowledge"]');
    await page.click('#knowledge-tab-faq');
    await expect(page.locator('#knowledge-faq-list')).toContainText('如何重置密码');
  });
});
