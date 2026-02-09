import { PermissionKey } from '../../config/permissions';
import { Role } from '../../domain/permissions/models/Role';
import { IRoleRepository } from '../../domain/permissions/repositories/IRoleRepository';
import { RoleEntity } from '../database/entities/RoleEntity';
import { RoleRepository } from './RoleRepository';

function toDomainRole(entity: RoleEntity): Role {
  return {
    id: entity.id,
    key: entity.key,
    name: entity.name,
    description: entity.description ?? null,
    permissions: (entity.permissions || []) as PermissionKey[],
    isSystem: entity.isSystem,
    status: entity.status,
  };
}

export class PermissionRoleRepository implements IRoleRepository {
  constructor(private readonly roleRepository: RoleRepository) {}

  async list(): Promise<Role[]> {
    const roles = await this.roleRepository.list();
    return roles.map(toDomainRole);
  }

  async findById(id: string): Promise<Role | null> {
    const role = await this.roleRepository.findById(id);
    return role ? toDomainRole(role) : null;
  }

  async findByKey(key: string): Promise<Role | null> {
    const role = await this.roleRepository.findByKey(key);
    return role ? toDomainRole(role) : null;
  }

  async create(role: Partial<Role>): Promise<Role> {
    const created = await this.roleRepository.create({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description ?? null,
      permissions: role.permissions ?? [],
      isSystem: role.isSystem ?? false,
      status: role.status ?? 'active',
    });
    return toDomainRole(created);
  }

  async updateById(id: string, updates: Partial<Role>): Promise<Role | null> {
    const updated = await this.roleRepository.updateById(id, {
      name: updates.name,
      description: updates.description ?? null,
      permissions: updates.permissions,
      isSystem: updates.isSystem,
      status: updates.status,
    });
    return updated ? toDomainRole(updated) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.roleRepository.deleteById(id);
  }
}
