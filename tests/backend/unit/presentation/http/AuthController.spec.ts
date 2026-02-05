import { describe, expect, it, vi } from 'vitest';
import { AuthController } from '@presentation/http/controllers/AuthController';

const makeReply = () => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
  jwtSign: vi.fn().mockResolvedValue('token'),
});

describe('AuthController', () => {
  const loginUseCase = { execute: vi.fn() };
  const registerUseCase = { execute: vi.fn() };
  const getCurrentUserUseCase = { execute: vi.fn() };

  const controller = new AuthController(
    loginUseCase as any,
    registerUseCase as any,
    getCurrentUserUseCase as any,
  );

  it('logs in and returns token', async () => {
    loginUseCase.execute.mockResolvedValue({ id: 'u1', email: 'a@b.com', role: 'agent', name: 'User' });
    const reply = makeReply();
    await controller.login({ body: { email: 'a@b.com', password: 'x' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('registers user', async () => {
    registerUseCase.execute.mockResolvedValue({ id: 'u1' });
    const reply = makeReply();
    await controller.register({ body: { email: 'a@b.com', password: 'x' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(201);
  });

  it('returns 401 when missing user for me', async () => {
    const reply = makeReply();
    await controller.me({ user: {} } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(401);
  });

  it('returns me profile', async () => {
    getCurrentUserUseCase.execute.mockResolvedValue({ id: 'u1' });
    const reply = makeReply();
    await controller.me({ user: { sub: 'u1' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('handles error status mapping', async () => {
    loginUseCase.execute.mockRejectedValue(new Error('invalid credentials'));
    const reply = makeReply();
    await controller.login({ body: {} } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(401);
  });
});
