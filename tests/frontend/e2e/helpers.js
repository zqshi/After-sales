export async function seedAuth(page, overrides = {}) {
  const user = {
    id: 'user-001',
    name: '测试用户',
    role: 'agent',
    ...overrides.user,
  };
  const token = overrides.token || 'test-token';
  await page.addInitScript(
    ({ t, u }) => {
      localStorage.setItem('authToken', t);
      localStorage.setItem('authUser', JSON.stringify(u));
    },
    { t: token, u: user },
  );
}

export async function mockApi(page, extraHandlers = {}) {
  await page.route('**/api/**', async (route) => {
    const resourceType = route.request().resourceType();
    if (resourceType === 'script' || resourceType === 'stylesheet') {
      return route.fallback();
    }
    const url = route.request().url();
    if (extraHandlers.handle && await extraHandlers.handle(route, url)) {
      return;
    }
    if (url.includes('/api/auth/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'user-001',
            name: '测试用户',
            role: 'agent',
          },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

export async function ensureMainLoaded(page, timeout = 3000) {
  await page.waitForLoadState('domcontentloaded');
  try {
    await page.waitForFunction(
      () => typeof window.openFullAnalysisPanel === 'function',
      { timeout },
    );
    return true;
  } catch {
    return false;
  }
}

export function attachPageDiagnostics(page) {
  const errors = [];
  const failedRequests = [];
  const scriptMimes = [];

  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console: ${msg.text()}`);
    }
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    failedRequests.push(`${request.url()} ${failure ? failure.errorText : ''}`.trim());
  });
  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('.js') && !url.includes('/@vite/client')) {
      return;
    }
    const contentType = response.headers()['content-type'] || '';
    if (!contentType.includes('javascript')) {
      scriptMimes.push(`${url} -> ${contentType || 'unknown'}`);
    }
  });

  return { errors, failedRequests, scriptMimes };
}
