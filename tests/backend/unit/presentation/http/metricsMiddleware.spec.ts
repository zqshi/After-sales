import { describe, expect, it, vi } from 'vitest';

vi.mock('@infrastructure/monitoring/MetricsCollector', () => ({
  metricsCollector: {
    recordHttpRequest: vi.fn(),
  },
}));

import { metricsMiddleware, metricsResponseHook } from '@presentation/http/middleware/metricsMiddleware';
import { metricsCollector } from '@infrastructure/monitoring/MetricsCollector';

describe('metricsMiddleware', () => {
  it('stores startTime and calls done', () => {
    const request = {} as any;
    const done = vi.fn();
    metricsMiddleware(request, {} as any, done);
    expect((request as any).startTime).toBeTypeOf('number');
    expect(done).toHaveBeenCalled();
  });

  it('records http request metrics', () => {
    const request = {
      method: 'GET',
      url: '/health',
      routeOptions: { url: '/api/health' },
      startTime: Date.now() - 5,
    } as any;
    const reply = { statusCode: 200 } as any;
    const done = vi.fn();

    metricsResponseHook(request, reply, done);

    expect(metricsCollector.recordHttpRequest).toHaveBeenCalledWith(
      'GET',
      '/api/health',
      200,
      expect.any(Number),
    );
    expect(done).toHaveBeenCalled();
  });

  it('falls back to request url when routeOptions missing', () => {
    const request = {
      method: 'POST',
      url: '/fallback',
    } as any;
    const reply = { statusCode: 201 } as any;
    const done = vi.fn();

    metricsResponseHook(request, reply, done);

    expect(metricsCollector.recordHttpRequest).toHaveBeenCalledWith(
      'POST',
      '/fallback',
      201,
      expect.any(Number),
    );
  });
});
