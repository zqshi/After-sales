import { PermissionKey } from '../../../config/permissions';
import { resolvePermissionsFromUiKeys, resolveUiPermissions } from '../../../config/uiPermissions';
import { RoleRepository } from '../../../infrastructure/repositories/RoleRepository';
import { UpdateRoleRequestDTO } from '../../dto/permissions/RoleRequestDTO';
import { RoleResponseDTO } from '../../dto/permissions/RoleResponseDTO';

export class UpdateRoleUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(roleKey: string, payload: UpdateRoleRequestDTO): Promise<RoleResponseDTO> {
    const role = await this.roleRepository.findByKey(roleKey);
    if (!role) {
      throw new Error('role not found');
    }

    const updates: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name || name.length < 2) {
        throw new Error('role name must be at least 2 characters');
      }
      updates.name = name;
    }

    if (payload.description !== undefined) {
      updates.description = payload.description?.trim() || null;
    }

    if (payload.uiPermissions) {
      updates.permissions = resolvePermissionsFromUiKeys(payload.uiPermissions);
    }

    const updated = await this.roleRepository.updateById(role.id, updates);
    if (!updated) {
      throw new Error('role not found');
    }

    return {
      id: updated.key,
      name: updated.name,
      description: updated.description,
      isSystem: updated.isSystem,
      uiPermissions: resolveUiPermissions(updated.permissions as PermissionKey[]),
    };
  }
}
