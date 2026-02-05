import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LoginUseCase } from '@application/use-cases/auth/LoginUseCase';

const { verifyPasswordMock } = vi.hoisted(() => ({ verifyPasswordMock: vi.fn() }));

vi.mock('@infrastructure/security/passwordHasher', () => ({
  verifyPassword: verifyPasswordMock,
}));

describe('LoginUseCase', () => {
  const userRepository = {
    findByEmailOrPhone: vi.fn(),
    updateLastLogin: vi.fn(),
  };

  beforeEach(() => {
    verifyPasswordMock.mockReset();
    userRepository.findByEmailOrPhone.mockReset();
    userRepository.updateLastLogin.mockReset();
  });

  it('validates required fields', async () => {
    const useCase = new LoginUseCase(userRepository as any);
    await expect(useCase.execute({ identifier: '', password: '' } as any)).rejects.toThrow(
      'identifier and password are required',
    );
  });

  it('rejects invalid credentials', async () => {
    const useCase = new LoginUseCase(userRepository as any);
    userRepository.findByEmailOrPhone.mockResolvedValue(null);
    await expect(useCase.execute({ identifier: 'a', password: 'b' } as any)).rejects.toThrow(
      'invalid credentials',
    );
  });

  it('rejects disabled account', async () => {
    const useCase = new LoginUseCase(userRepository as any);
    userRepository.findByEmailOrPhone.mockResolvedValue({ status: 'disabled' });
    await expect(useCase.execute({ identifier: 'a', password: 'b' } as any)).rejects.toThrow(
      'account disabled',
    );
  });

  it('rejects invalid password', async () => {
    const useCase = new LoginUseCase(userRepository as any);
    userRepository.findByEmailOrPhone.mockResolvedValue({
      id: 'u1',
      status: 'active',
      passwordSalt: 's',
      passwordHash: 'h',
      passwordIterations: 1,
    });
    verifyPasswordMock.mockReturnValue(false);
    await expect(useCase.execute({ identifier: 'a', password: 'b' } as any)).rejects.toThrow(
      'invalid credentials',
    );
  });

  it('returns user data on success', async () => {
    const useCase = new LoginUseCase(userRepository as any);
    const user = {
      id: 'u1',
      email: 'a@b.com',
      phone: '13800138000',
      name: 'User',
      role: 'admin',
      status: 'active',
      passwordSalt: 's',
      passwordHash: 'h',
      passwordIterations: 1,
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      metadata: { team: 'T' },
    };
    userRepository.findByEmailOrPhone.mockResolvedValue(user);
    verifyPasswordMock.mockReturnValue(true);

    const result = await useCase.execute({ identifier: 'a', password: 'b' } as any);
    expect(result.id).toBe('u1');
    expect(userRepository.updateLastLogin).toHaveBeenCalledTimes(1);
  });
});
