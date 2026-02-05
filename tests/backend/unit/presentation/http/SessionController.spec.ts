import { describe, expect, it, vi } from 'vitest';
import { SessionController } from '@presentation/http/controllers/SessionController';

const makeReply = () => {
  const reply: any = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply;
};

describe('SessionController', () => {
  it('returns roles from repository when available', async () => {
    const roleRepository = { list: vi.fn().mockResolvedValue([{ key: 'admin' }, { key: 'agent' }]) };
    const controller = new SessionController(roleRepository as any);
    const reply = makeReply();

    await controller.getRoles({} as any, reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      success: true,
      data: { roles: ['admin', 'agent'] },
    });
  });

  it('falls back to default roles', async () => {
    const roleRepository = { list: vi.fn().mockResolvedValue([]) };
    const controller = new SessionController(roleRepository as any);
    const reply = makeReply();

    await controller.getRoles({} as any, reply);

    expect(reply.send).toHaveBeenCalledWith({
      success: true,
      data: { roles: ['admin', 'manager', 'agent'] },
    });
  });

  it('returns permissions payload', async () => {
    const roleRepository = { list: vi.fn() };
    const controller = new SessionController(roleRepository as any);
    const reply = makeReply();
    const request: any = {
      user: { role: 'agent' },
      server: {},
    };

    await controller.getPermissions(request, reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    const payload = reply.send.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.role).toBe('agent');
    expect(Array.isArray(payload.data.permissions)).toBe(true);
  });
});
