/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
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
      const merged = role === 'admin'
        ? Array.from(new Set([...perms, ...getDefaultRolePermissions(role)]))
        : perms;
      this.cache.set(role, merged);
      return merged;
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
