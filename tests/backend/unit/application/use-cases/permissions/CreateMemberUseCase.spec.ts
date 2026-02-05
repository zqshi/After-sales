import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateMemberUseCase } from '@application/use-cases/permissions/CreateMemberUseCase';

const { hashPasswordMock } = vi.hoisted(() => ({ hashPasswordMock: vi.fn() }));

vi.mock('@infrastructure/security/passwordHasher', () => ({
  hashPassword: hashPasswordMock,
}));

describe('CreateMemberUseCase', () => {
  const userRepository = {
    findByEmail: vi.fn(),
    findByPhone: vi.fn(),
    create: vi.fn(),
  };
  const roleRepository = {
    findByKey: vi.fn(),
  };

  beforeEach(() => {
    userRepository.findByEmail.mockReset();
    userRepository.findByPhone.mockReset();
    userRepository.create.mockReset();
    roleRepository.findByKey.mockReset();
    hashPasswordMock.mockReset();
  });

  it('validates payload and rejects invalid email', async () => {
    const useCase = new CreateMemberUseCase(userRepository as any, roleRepository as any);
    await expect(useCase.execute({ email: 'bad', name: 'A', password: 'Abcdef12', roleId: 'r1' } as any))
      .rejects.toThrow('invalid email format');
  });

  it('rejects when email and phone are missing', async () => {
    const useCase = new CreateMemberUseCase(userRepository as any, roleRepository as any);
    await expect(useCase.execute({ name: 'User', password: 'Abcdef12', roleId: 'r1' } as any))
      .rejects.toThrow('email or phone is required');
  });

  it('rejects invalid phone format', async () => {
    const useCase = new CreateMemberUseCase(userRepository as any, roleRepository as any);
    await expect(useCase.execute({ phone: '123', name: 'User', password: 'Abcdef12', roleId: 'r1' } as any))
      .rejects.toThrow('invalid phone format');
  });

  it('rejects short name', async () => {
    const useCase = new CreateMemberUseCase(userRepository as any, roleRepository as any);
    await expect(useCase.execute({ email: 'a@b.com', name: 'A', password: 'Abcdef12', roleId: 'r1' } as any))
      .rejects.toThrow('name must be at least 2 characters');
  });

  it('rejects password missing complexity', async () => {
    const useCase = new CreateMemberUseCase(userRepository as any, roleRepository as any);
    await expect(useCase.execute({ email: 'a@b.com', name: 'User', password: 'abcdefgh', roleId: 'r1' } as any))
      .rejects.toThrow('password must include upper, lower, and number');
  });

  it('rejects when role is missing', async () => {
    const useCase = new CreateMemberUseCase(userRepository as any, roleRepository as any);
    await expect(useCase.execute({ email: 'a@b.com', name: 'User', password: 'Abcdef12' } as any))
      .rejects.toThrow('role is required');
  });

  it('rejects duplicate email', async () => {
    const useCase = new CreateMemberUseCase(userRepository as any, roleRepository as any);
    userRepository.findByEmail.mockResolvedValue({ id: 'u1' });
    await expect(useCase.execute({ email: 'a@b.com', name: 'User', password: 'Abcdef12', roleId: 'r1' } as any))
      .rejects.toThrow('email already exists');
  });

  it('rejects when role not found', async () => {
    const useCase = new CreateMemberUseCase(userRepository as any, roleRepository as any);
    roleRepository.findByKey.mockResolvedValue(null);
    await expect(useCase.execute({ email: 'a@b.com', name: 'User', password: 'Abcdef12', roleId: 'r1' } as any))
      .rejects.toThrow('role not found');
  });

  it('rejects duplicate phone', async () => {
    const useCase = new CreateMemberUseCase(userRepository as any, roleRepository as any);
    userRepository.findByPhone.mockResolvedValue({ id: 'u2' });
    await expect(useCase.execute({ phone: '13800138000', name: 'User', password: 'Abcdef12', roleId: 'r1' } as any))
      .rejects.toThrow('phone already exists');
  });

  it('rejects when password missing requirements', async () => {
    const useCase = new CreateMemberUseCase(userRepository as any, roleRepository as any);
    await expect(useCase.execute({ email: 'a@b.com', name: 'User', password: 'abcdefg', roleId: 'r1' } as any))
      .rejects.toThrow('password must be at least 8 characters');
  });

  it('creates member successfully', async () => {
    const useCase = new CreateMemberUseCase(userRepository as any, roleRepository as any);
    roleRepository.findByKey.mockResolvedValue({ key: 'agent' });
    hashPasswordMock.mockReturnValue({ hash: 'h', salt: 's', iterations: 1, algorithm: 'pbkdf2' });
    userRepository.create.mockResolvedValue({
      id: 'u1',
      name: 'User',
      email: 'a@b.com',
      phone: null,
      role: 'agent',
      status: 'active',
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      metadata: { team: 'T', badge: 'B' },
    });

    const result = await useCase.execute({
      email: 'a@b.com',
      name: 'User',
      password: 'Abcdef12',
      roleId: 'agent',
      team: 'T',
      badge: 'B',
    } as any);

    expect(result.id).toBe('u1');
    expect(userRepository.create).toHaveBeenCalledTimes(1);
  });
});
