import { test, expect } from '@playwright/test';
import { seedAuth, mockApi } from './helpers.js';

test.describe('权限体系', () => {
  test('权限接口返回与UI渲染一致', async ({ page }) => {
    await seedAuth(page);
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
                  'dock.tools': false,
                  'dock.reports': false,
                  'dock.permissions': true,
                },
              },
            }),
          });
          return true;
        }
        return false;
      },
    });

    await page.goto('/app.html');
    await expect(page.locator('[data-dock-tab="messages"]')).not.toHaveClass(/hidden/);
    await expect(page.locator('[data-dock-tab="knowledge"]')).not.toHaveClass(/hidden/);
    await expect(page.locator('[data-dock-tab="tools"]')).toHaveClass(/hidden/);
    await expect(page.locator('[data-dock-tab="reports"]')).toHaveClass(/hidden/);
    await expect(page.locator('[data-dock-tab="permissions"]')).not.toHaveClass(/hidden/);
  });

  test('权限返回后隐藏无权限入口', async ({ page }) => {
    await seedAuth(page);
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
                  'dock.reports': false,
                  'dock.permissions': false,
                },
              },
            }),
          });
          return true;
        }
        return false;
      },
    });

    await page.goto('/app.html');

    await expect(page.locator('[data-dock-tab="reports"]')).toHaveClass(/hidden/);
    await expect(page.locator('[data-dock-tab="permissions"]')).toHaveClass(/hidden/);
  });

  test('权限变更后入口可见性即时生效', async ({ page }) => {
    let callCount = 0;
    await seedAuth(page);
    await mockApi(page, {
      handle: async (route, url) => {
        const { pathname } = new URL(url);
        if (pathname.endsWith('/session/permissions')) {
          callCount += 1;
          const firstResponse = {
            success: true,
            data: {
              role: 'agent',
              permissions: [],
              uiPermissions: {
                'dock.messages': true,
                'dock.knowledge': true,
                'dock.tools': true,
                'dock.reports': false,
                'dock.permissions': true,
              },
            },
          };
          const secondResponse = {
            success: true,
            data: {
              role: 'leadership',
              permissions: [],
              uiPermissions: {
                'dock.messages': true,
                'dock.knowledge': true,
                'dock.tools': true,
                'dock.reports': true,
                'dock.permissions': true,
              },
            },
          };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(callCount === 1 ? firstResponse : secondResponse),
          });
          return true;
        }
        return false;
      },
    });

    await page.goto('/app.html');
    await expect(page.locator('[data-dock-tab="reports"]')).toHaveClass(/hidden/);

    await page.reload();
    await expect(page.locator('[data-dock-tab="reports"]')).not.toHaveClass(/hidden/);
  });

  test('角色切换影响入口可见性', async ({ page }) => {
    await seedAuth(page, { user: { role: 'quality_specialist' } });
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
                role: 'quality_specialist',
                permissions: [],
                uiPermissions: {
                  'dock.messages': true,
                  'dock.messages.tasks': true,
                  'dock.knowledge': true,
                  'dock.tools': true,
                  'dock.reports': false,
                  'dock.permissions': true,
                },
              },
            }),
          });
          return true;
        }
        return false;
      },
    });

    await page.goto('/app.html');
    await expect(page.locator('[data-dock-tab="reports"]')).toHaveClass(/hidden/);
    await expect(page.locator('[data-dock-parent="messages"][data-dock-subtab="tasks"]')).not.toHaveClass(/hidden/);

    await page.route('**/api/**/session/permissions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            role: 'leadership',
            permissions: [],
            uiPermissions: {
              'dock.messages': true,
              'dock.messages.tasks': false,
              'dock.knowledge': true,
              'dock.tools': true,
              'dock.reports': true,
              'dock.permissions': true,
            },
          },
        }),
      });
    });

    await page.reload();
    await expect(page.locator('[data-dock-tab="reports"]')).not.toHaveClass(/hidden/);
    await expect(page.locator('[data-dock-parent="messages"][data-dock-subtab="tasks"]')).toHaveClass(/hidden/);
  });
});
