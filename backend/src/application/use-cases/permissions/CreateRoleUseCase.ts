import { randomUUID } from 'crypto';

import { RoleRepository } from '../../../infrastructure/repositories/RoleRepository';
import { CreateRoleRequestDTO } from '../../dto/permissions/RoleRequestDTO';
import { RoleResponseDTO } from '../../dto/permissions/RoleResponseDTO';
import { resolvePermissionsFromUiKeys, resolveUiPermissions } from '../../../config/uiPermissions';

export class CreateRoleUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(payload: CreateRoleRequestDTO): Promise<RoleResponseDTO> {
    if (!payload.name || payload.name.trim().length < 2) {
      throw new Error('role name must be at least 2 characters');
    }

    const roleKey = `role-${Date.now()}`;
    const permissions = resolvePermissionsFromUiKeys(payload.uiPermissions ?? []);

    const role = await this.roleRepository.create({
      id: randomUUID(),
      key: roleKey,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      permissions,
      isSystem: false,
      status: 'active',
    });

    return {
      id: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      uiPermissions: resolveUiPermissions(role.permissions),
    };
  }
}
