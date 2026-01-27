import { PermissionKey } from '../../../config/permissions';
import { resolveUiPermissions } from '../../../config/uiPermissions';
import { RoleRepository } from '../../../infrastructure/repositories/RoleRepository';
import { RoleResponseDTO } from '../../dto/permissions/RoleResponseDTO';

export class ListRolesUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(): Promise<RoleResponseDTO[]> {
    const roles = await this.roleRepository.list();
    return roles.map((role) => ({
      id: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      uiPermissions: resolveUiPermissions(role.permissions as PermissionKey[]),
    }));
  }
}
