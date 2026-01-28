import { test, expect } from '@playwright/test';
import { seedAuth, mockApi, attachPageDiagnostics } from './helpers.js';

test.describe('Dock导航与分析面板', () => {
  test('Dock切换与子菜单切换', async ({ page }) => {
    const diagnostics = attachPageDiagnostics(page);
    test.setTimeout(20000);
    await seedAuth(page);
    await mockApi(page);

    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const mainLoaded = await page.evaluate(() => typeof window.openFullAnalysisPanel === 'function');
    if (!mainLoaded) {
      const resourceSnapshot = await page.evaluate(async () => {
        const entries = performance.getEntriesByType('resource')
          .filter((entry) => entry.name.includes('/assets/js/main.js'))
          .map((entry) => ({ name: entry.name, initiatorType: entry.initiatorType }));
        let status = null;
        let ok = null;
        try {
          const res = await fetch('/assets/js/main.js', { cache: 'no-store' });
          status = res.status;
          ok = res.ok;
        } catch (_error) {
          status = 'fetch_failed';
        }
        return { entries, status, ok };
      });
      throw new Error(
        `main.js 未加载: ${JSON.stringify(resourceSnapshot)}\n` +
        `Console errors:\n${diagnostics.errors.join('\n')}\n` +
        `Request failures:\n${diagnostics.failedRequests.join('\n')}\n` +
        `Script MIME:\n${diagnostics.scriptMimes.join('\n')}`
      );
    }

    await page.click('[data-dock-tab="knowledge"]');
    await expect(page.locator('#workspace-knowledge-tab')).toHaveClass(/active/);

    await page.click('[data-dock-tab="messages"]');
    await page.click('[data-dock-parent="messages"][data-dock-subtab="tasks"]');
    await expect(page.locator('#tasks-tab')).toHaveClass(/active/);
  });

  test('分析面板打开与关闭', async ({ page }) => {
    const diagnostics = attachPageDiagnostics(page);
    test.setTimeout(20000);
    await seedAuth(page);
    await mockApi(page);

    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const mainLoaded = await page.evaluate(() => typeof window.openFullAnalysisPanel === 'function');
    if (!mainLoaded) {
      const resourceSnapshot = await page.evaluate(async () => {
        const entries = performance.getEntriesByType('resource')
          .filter((entry) => entry.name.includes('/assets/js/main.js'))
          .map((entry) => ({ name: entry.name, initiatorType: entry.initiatorType }));
        let status = null;
        let ok = null;
        try {
          const res = await fetch('/assets/js/main.js', { cache: 'no-store' });
          status = res.status;
          ok = res.ok;
        } catch (_error) {
          status = 'fetch_failed';
        }
        return { entries, status, ok };
      });
      throw new Error(
        `main.js 未加载: ${JSON.stringify(resourceSnapshot)}\n` +
        `Console errors:\n${diagnostics.errors.join('\n')}\n` +
        `Request failures:\n${diagnostics.failedRequests.join('\n')}\n` +
        `Script MIME:\n${diagnostics.scriptMimes.join('\n')}`
      );
    }

    const drawer = page.locator('#right-sidebar');
    await expect(drawer).toHaveClass(/translate-x-full/);

    await page.evaluate(() => window.openFullAnalysisPanel());
    await expect(drawer).not.toHaveClass(/translate-x-full/);

    await page.evaluate(() => window.toggleRightSidebar(false));
    await expect(drawer).toHaveClass(/translate-x-full/);
  });
});
