import { PermissionKey, getRolePermissions as getDefaultRolePermissions } from '../../config/permissions';
import { RoleRepository } from '../../infrastructure/repositories/RoleRepository';

export class RolePermissionService {
  private cache = new Map<string, PermissionKey[]>();

  constructor(private readonly roleRepository: RoleRepository) {}

  async getPermissions(role: string | undefined): Promise<PermissionKey[]> {
    if (!role) {
      return [];
    }
    const cached = this.cache.get(role);
    if (cached) {
      return cached;
    }
    const fromDb = await this.roleRepository.findByKey(role);
    if (fromDb?.permissions?.length) {
      const perms = fromDb.permissions as PermissionKey[];
      this.cache.set(role, perms);
      return perms;
    }
    const fallback = getDefaultRolePermissions(role);
    if (fallback.length) {
      this.cache.set(role, fallback);
    }
    return fallback;
  }

  async refresh(): Promise<void> {
    const roles = await this.roleRepository.list();
    this.cache.clear();
    roles.forEach((role) => {
      this.cache.set(role.key, role.permissions as PermissionKey[]);
    });
  }

  async upsertRolePermissions(roleKey: string, permissions: PermissionKey[]): Promise<void> {
    this.cache.set(roleKey, permissions);
  }

  async removeRole(roleKey: string): Promise<void> {
    this.cache.delete(roleKey);
  }
}
