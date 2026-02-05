import { describe, expect, it, vi, beforeEach } from 'vitest';

const { hashPasswordMock } = vi.hoisted(() => ({ hashPasswordMock: vi.fn() }));

vi.mock('@infrastructure/security/passwordHasher', () => ({
  hashPassword: hashPasswordMock,
}));

vi.mock('@config/app.config', () => ({
  config: {
    auth: {
      allowSignup: true,
      defaultRole: 'agent',
    },
  },
}));

import { RegisterUseCase } from '@application/use-cases/auth/RegisterUseCase';

describe('RegisterUseCase', () => {
  const userRepository = {
    findByEmail: vi.fn(),
    findByPhone: vi.fn(),
    create: vi.fn(),
  };

  beforeEach(() => {
    userRepository.findByEmail.mockReset();
    userRepository.findByPhone.mockReset();
    userRepository.create.mockReset();
    hashPasswordMock.mockReset();
  });

  it('creates user when payload is valid', async () => {
    hashPasswordMock.mockReturnValue({
      hash: 'hash',
      salt: 'salt',
      iterations: 1,
      algorithm: 'pbkdf2',
    });
    userRepository.create.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      phone: null,
      name: 'User',
      role: 'agent',
      status: 'active',
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      metadata: {},
    });

    const useCase = new RegisterUseCase(userRepository as any);
    const result = await useCase.execute({
      email: 'a@b.com',
      name: 'User',
      password: 'Abcdef12',
    } as any);

    expect(result.id).toBe('u1');
    expect(userRepository.create).toHaveBeenCalledTimes(1);
  });

  it('rejects when signup disabled', async () => {
    vi.resetModules();
    vi.doMock('@config/app.config', () => ({
      config: {
        auth: {
          allowSignup: false,
          defaultRole: 'agent',
        },
      },
    }));
    const { RegisterUseCase: DisabledRegisterUseCase } = await import(
      '@application/use-cases/auth/RegisterUseCase'
    );

    const useCase = new DisabledRegisterUseCase(userRepository as any);
    await expect(
      useCase.execute({ email: 'a@b.com', name: 'User', password: 'Abcdef12' } as any),
    ).rejects.toThrow('signup is disabled');
  });

  it('rejects invalid email', async () => {
    const useCase = new RegisterUseCase(userRepository as any);
    await expect(
      useCase.execute({ email: 'bad', name: 'User', password: 'Abcdef12' } as any),
    ).rejects.toThrow('invalid email format');
  });

  it('rejects invalid phone', async () => {
    const useCase = new RegisterUseCase(userRepository as any);
    await expect(
      useCase.execute({ phone: '123', name: 'User', password: 'Abcdef12' } as any),
    ).rejects.toThrow('invalid phone format');
  });

  it('rejects short name and weak password', async () => {
    const useCase = new RegisterUseCase(userRepository as any);
    await expect(
      useCase.execute({ email: 'a@b.com', name: 'A', password: 'abc' } as any),
    ).rejects.toThrow('name must be at least 2 characters');
  });
});
