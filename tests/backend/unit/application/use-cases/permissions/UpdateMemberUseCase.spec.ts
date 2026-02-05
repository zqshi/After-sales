import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateMemberUseCase } from '@application/use-cases/permissions/UpdateMemberUseCase';

describe('UpdateMemberUseCase', () => {
  const userRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByPhone: vi.fn(),
    updateById: vi.fn(),
  };
  const roleRepository = {
    findByKey: vi.fn(),
  };

  beforeEach(() => {
    userRepository.findById.mockReset();
    userRepository.findByEmail.mockReset();
    userRepository.findByPhone.mockReset();
    userRepository.updateById.mockReset();
    roleRepository.findByKey.mockReset();
  });

  it('rejects when member missing', async () => {
    const useCase = new UpdateMemberUseCase(userRepository as any, roleRepository as any);
    userRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute('u1', { name: 'User' } as any)).rejects.toThrow('member not found');
  });

  it('rejects duplicate email', async () => {
    const useCase = new UpdateMemberUseCase(userRepository as any, roleRepository as any);
    userRepository.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com', phone: null, role: 'agent', status: 'active', name: 'User', metadata: {} });
    userRepository.findByEmail.mockResolvedValue({ id: 'u2' });
    await expect(useCase.execute('u1', { email: 'other@b.com' } as any)).rejects.toThrow('email already exists');
  });

  it('rejects invalid email format', async () => {
    const useCase = new UpdateMemberUseCase(userRepository as any, roleRepository as any);
    userRepository.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com', phone: null, role: 'agent', status: 'active', name: 'User', metadata: {} });
    await expect(useCase.execute('u1', { email: 'bad' } as any)).rejects.toThrow('invalid email format');
  });

  it('rejects invalid phone format', async () => {
    const useCase = new UpdateMemberUseCase(userRepository as any, roleRepository as any);
    userRepository.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com', phone: null, role: 'agent', status: 'active', name: 'User', metadata: {} });
    await expect(useCase.execute('u1', { phone: '123' } as any)).rejects.toThrow('invalid phone format');
  });

  it('rejects duplicate phone', async () => {
    const useCase = new UpdateMemberUseCase(userRepository as any, roleRepository as any);
    userRepository.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com', phone: '13800138000', role: 'agent', status: 'active', name: 'User', metadata: {} });
    userRepository.findByPhone.mockResolvedValue({ id: 'u2' });
    await expect(useCase.execute('u1', { phone: '13900139000' } as any)).rejects.toThrow('phone already exists');
  });

  it('keeps existing email and phone without duplicate checks', async () => {
    const useCase = new UpdateMemberUseCase(userRepository as any, roleRepository as any);
    userRepository.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com', phone: '13800138000', role: 'agent', status: 'active', name: 'User', metadata: {} });
    userRepository.updateById.mockResolvedValue({
      id: 'u1',
      name: 'User',
      email: 'a@b.com',
      phone: '13800138000',
      role: 'agent',
      status: 'active',
      metadata: {},
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    await useCase.execute('u1', { email: 'a@b.com', phone: '13800138000' } as any);
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
    expect(userRepository.findByPhone).not.toHaveBeenCalled();
  });

  it('rejects when role not found', async () => {
    const useCase = new UpdateMemberUseCase(userRepository as any, roleRepository as any);
    userRepository.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com', phone: null, role: 'agent', status: 'active', name: 'User', metadata: {} });
    roleRepository.findByKey.mockResolvedValue(null);
    await expect(useCase.execute('u1', { roleId: 'missing' } as any)).rejects.toThrow('role not found');
  });

  it('rejects when update returns null', async () => {
    const useCase = new UpdateMemberUseCase(userRepository as any, roleRepository as any);
    userRepository.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com', phone: null, role: 'agent', status: 'active', name: 'User', metadata: {} });
    userRepository.updateById.mockResolvedValue(null);
    await expect(useCase.execute('u1', { name: 'User' } as any)).rejects.toThrow('member not found');
  });

  it('updates member data and returns response', async () => {
    const useCase = new UpdateMemberUseCase(userRepository as any, roleRepository as any);
    userRepository.findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      phone: '13800138000',
      role: 'agent',
      status: 'active',
      name: 'User',
      metadata: { team: 'Old', badge: 'Old' },
    });
    roleRepository.findByKey.mockResolvedValue({ key: 'manager' });
    userRepository.updateById.mockResolvedValue({
      id: 'u1',
      name: 'New Name',
      email: 'a@b.com',
      phone: '13800138000',
      role: 'manager',
      status: 'active',
      metadata: { team: 'Team', badge: 'Badge' },
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const result = await useCase.execute('u1', {
      name: ' New Name ',
      roleId: 'manager',
      team: 'Team',
      badge: 'Badge',
    } as any);

    expect(result.roleId).toBe('manager');
    expect(result.team).toBe('Team');
    expect(userRepository.updateById).toHaveBeenCalledTimes(1);
  });
});
