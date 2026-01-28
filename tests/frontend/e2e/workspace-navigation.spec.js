import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

async function allowAllPermissions(page) {
  await mockApi(page, {
    handle: async (route, url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/session/permissions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              role: 'agent',
              permissions: [],
              uiPermissions: {
                'dock.messages': true,
                'dock.knowledge': true,
                'dock.tools': true,
                'dock.reports': true,
                'dock.permissions': true,
                'dock.messages.tasks': true,
              },
            },
          }),
        });
        return true;
      }
      return false;
    },
  });
}

test.describe('Workspace导航', () => {
  test('知识/应用/工具/报表/权限切换', async ({ page }) => {
    await seedAuth(page);
    await allowAllPermissions(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="knowledge"]');
    await expect(page.locator('#workspace-knowledge-tab')).toHaveClass(/active/);

    await page.click('[data-dock-parent="knowledge"][data-dock-subtab="knowledge-application"]');
    await expect(page.locator('#workspace-knowledge-application-tab')).toHaveClass(/active/);

    await page.click('[data-dock-tab="tools"]');
    await expect(page.locator('#workspace-tools-tab')).toHaveClass(/active/);

    await page.click('[data-dock-tab="reports"]');
    await expect(page.locator('#workspace-reports-tab')).toHaveClass(/active/);

    await page.click('[data-dock-tab="permissions"]');
    await expect(page.locator('#workspace-permissions-tab')).toHaveClass(/active/);
  });

  test('消息子菜单切换任务workspace', async ({ page }) => {
    await seedAuth(page);
    await allowAllPermissions(page);
    await page.goto('/app.html');

    await page.click('[data-dock-tab="messages"]');
    await page.locator('[data-dock-parent="messages"][data-dock-subtab="tasks"]').click({ force: true });
    await expect(page.locator('#workspace-tasks-tab')).toHaveClass(/active/);
  });
});
