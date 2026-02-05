import { describe, expect, it, vi } from 'vitest';
import { authMiddleware } from '@presentation/http/middleware/authMiddleware';

const makeReply = () => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
});

describe('authMiddleware', () => {
  it('skips OPTIONS requests', async () => {
    const reply = makeReply();
    const request = { method: 'OPTIONS', routeOptions: {}, jwtVerify: vi.fn() };

    await authMiddleware(request as any, reply as any);

    expect(request.jwtVerify).not.toHaveBeenCalled();
  });

  it('skips when auth disabled in route config', async () => {
    const reply = makeReply();
    const request = { method: 'GET', routeOptions: { config: { auth: false } }, jwtVerify: vi.fn() };

    await authMiddleware(request as any, reply as any);

    expect(request.jwtVerify).not.toHaveBeenCalled();
  });

  it('verifies jwt and allows request', async () => {
    const reply = makeReply();
    const request = { method: 'GET', routeOptions: { config: { auth: true } }, jwtVerify: vi.fn().mockResolvedValue(undefined) };

    await authMiddleware(request as any, reply as any);

    expect(request.jwtVerify).toHaveBeenCalledTimes(1);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('returns 401 on jwt failure', async () => {
    const reply = makeReply();
    const request = { method: 'GET', routeOptions: {}, jwtVerify: vi.fn().mockRejectedValue(new Error('fail')) };

    await authMiddleware(request as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send.mock.calls[0][0].error).toBe('Unauthorized');
  });
});
