import { describe, expect, it, vi } from 'vitest';
import { GetCurrentUserUseCase } from '@application/use-cases/auth/GetCurrentUserUseCase';

describe('GetCurrentUserUseCase', () => {
  const userRepository = {
    findById: vi.fn(),
  };

  it('throws when user not found', async () => {
    userRepository.findById.mockResolvedValueOnce(null);
    const useCase = new GetCurrentUserUseCase(userRepository as any);
    await expect(useCase.execute('u1')).rejects.toThrow('user not found');
  });

  it('returns user response', async () => {
    userRepository.findById.mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.com',
      phone: '13800138000',
      name: 'User',
      role: 'agent',
      status: 'active',
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      metadata: { team: 'T' },
    });
    const useCase = new GetCurrentUserUseCase(userRepository as any);
    const result = await useCase.execute('u1');
    expect(result.id).toBe('u1');
  });
});
