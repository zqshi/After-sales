import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateRoleUseCase } from '@application/use-cases/permissions/UpdateRoleUseCase';

vi.mock('@config/uiPermissions', () => ({
  resolvePermissionsFromUiKeys: (keys: string[]) => keys.map((k) => `perm:${k}`),
  resolveUiPermissions: (keys: string[]) => keys.map((k) => k.replace('perm:', 'ui:')),
}));

describe('UpdateRoleUseCase', () => {
  const roleRepository = {
    findByKey: vi.fn(),
    updateById: vi.fn(),
  };

  beforeEach(() => {
    roleRepository.findByKey.mockReset();
    roleRepository.updateById.mockReset();
  });

  it('throws when role missing', async () => {
    const useCase = new UpdateRoleUseCase(roleRepository as any);
    roleRepository.findByKey.mockResolvedValue(null);
    await expect(useCase.execute('agent', { name: 'Agent' } as any)).rejects.toThrow('role not found');
  });

  it('updates role name and ui permissions', async () => {
    const useCase = new UpdateRoleUseCase(roleRepository as any);
    roleRepository.findByKey.mockResolvedValue({ id: 'r1', key: 'agent' });
    roleRepository.updateById.mockResolvedValue({
      id: 'r1',
      key: 'agent',
      name: 'New',
      description: 'desc',
      isSystem: false,
      permissions: ['perm:chat.read'],
    });

    const result = await useCase.execute('agent', { name: ' New ', uiPermissions: ['chat.read'] } as any);
    expect(result.name).toBe('New');
    expect(result.uiPermissions).toEqual(['ui:chat.read']);
  });
});
