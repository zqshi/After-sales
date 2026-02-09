import { PermissionKey } from '../../../config/permissions';
import { resolveUiPermissions } from '../../../config/uiPermissions';
import { RoleResponseDTO } from '../../dto/permissions/RoleResponseDTO';
import { IRoleRepository } from '../../../domain/permissions/repositories/IRoleRepository';

export class ListRolesUseCase {
  constructor(private readonly roleRepository: IRoleRepository) {}

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
