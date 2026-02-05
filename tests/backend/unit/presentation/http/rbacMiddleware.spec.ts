import { describe, it, expect, vi } from 'vitest';
import { rbacMiddleware } from '../../../../../backend/src/presentation/http/middleware/rbacMiddleware';

describe('rbacMiddleware', () => {
  it('returns early for OPTIONS', async () => {
    const request = { method: 'OPTIONS', routeOptions: { config: {} } };
    const reply = { code: vi.fn(), send: vi.fn() };
    await rbacMiddleware(request as any, reply as any);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('returns early when auth disabled', async () => {
    const request = {
      method: 'GET',
      routeOptions: { config: { auth: false } },
    };
    const reply = { code: vi.fn(), send: vi.fn() };
    await rbacMiddleware(request as any, reply as any);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('returns early when no permissions required', async () => {
    const request = {
      method: 'GET',
      routeOptions: { config: { permissions: [] } },
    };
    const reply = { code: vi.fn(), send: vi.fn() };
    await rbacMiddleware(request as any, reply as any);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('returns 403 when role missing', async () => {
    const request = {
      method: 'GET',
      routeOptions: { config: { permissions: ['session.read'] } },
      user: {},
      server: {},
    };
    const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };
    await rbacMiddleware(request as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it('allows when permissions available', async () => {
    const request = {
      method: 'GET',
      routeOptions: { config: { permissions: ['session.read'] } },
      user: { role: 'admin' },
      server: {},
    };
    const reply = { code: vi.fn(), send: vi.fn() };
    await rbacMiddleware(request as any, reply as any);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('should return 403 when permissions are insufficient', async () => {
    const reply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };

    const request = {
      method: 'GET',
      routeOptions: {
        config: {
          permissions: ['session.read'],
        },
      },
      user: { role: 'agent' },
      server: {
        rolePermissionService: {
          getPermissions: vi.fn().mockResolvedValue([]),
        },
      },
    };

    await rbacMiddleware(request as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      error: 'Insufficient permissions',
    });
  });
});
