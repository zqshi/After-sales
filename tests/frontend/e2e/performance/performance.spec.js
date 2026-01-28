import { test, expect } from '@playwright/test';

test.describe('性能基线', () => {
  test('首屏加载 < 3s', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    const navTiming = await page.evaluate(() => {
      const entry = performance.getEntriesByType('navigation')[0];
      return entry ? entry.domContentLoadedEventEnd - entry.startTime : null;
    });
    expect(navTiming).not.toBeNull();
    expect(navTiming).toBeLessThan(3000);
  });

  test('关键交互 < 500ms', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    const start = Date.now();
    await page.click('[data-dock-tab="messages"]');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
