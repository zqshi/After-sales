import { describe, it, expect, vi } from 'vitest';
import { rbacMiddleware } from '../../../../../backend/src/presentation/http/middleware/rbacMiddleware';

describe('rbacMiddleware', () => {
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
