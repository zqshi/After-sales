const { defineConfig } = require('@playwright/test');

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

const webServer = process.env.E2E_NO_WEB_SERVER === 'true'
  ? undefined
  : {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    };

module.exports = defineConfig({
  testDir: './tests/frontend/e2e',
  outputDir: './tests/test-results',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer,
});
