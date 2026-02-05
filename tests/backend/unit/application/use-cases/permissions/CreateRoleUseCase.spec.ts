import { describe, expect, it, vi } from 'vitest';
import { CreateRoleUseCase } from '@application/use-cases/permissions/CreateRoleUseCase';

vi.mock('@config/uiPermissions', () => ({
  resolvePermissionsFromUiKeys: (keys: string[]) => keys.map((k) => `perm:${k}`),
  resolveUiPermissions: (keys: string[]) => keys.map((k) => k.replace('perm:', 'ui:')),
}));

describe('CreateRoleUseCase', () => {
  const roleRepository = {
    create: vi.fn(),
  };

  it('validates role name', async () => {
    const useCase = new CreateRoleUseCase(roleRepository as any);
    await expect(useCase.execute({ name: ' ' } as any)).rejects.toThrow('role name must be at least 2 characters');
  });

  it('creates role with permissions', async () => {
    roleRepository.create.mockResolvedValue({
      key: 'role-1',
      name: 'Agent',
      description: null,
      isSystem: false,
      permissions: ['perm:chat.read'],
    });
    const useCase = new CreateRoleUseCase(roleRepository as any);
    const result = await useCase.execute({ name: 'Agent', uiPermissions: ['chat.read'] } as any);
    expect(result.uiPermissions).toEqual(['ui:chat.read']);
  });
});
