import { FastifyReply, FastifyRequest } from 'fastify';
import { getRolePermissions, listAllPermissions } from '../../../config/permissions';
import { listUiPermissionGroups, resolveUiPermissions } from '../../../config/uiPermissions';
import { RoleRepository } from '../../../infrastructure/repositories/RoleRepository';

export class SessionController {
  constructor(private readonly roleRepository: RoleRepository) {}

  async getRoles(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const roles = await this.roleRepository.list();
    if (roles.length) {
      reply.code(200).send({
        success: true,
        data: {
          roles: roles.map((role) => role.key),
        },
      });
      return;
    }

    reply.code(200).send({
      success: true,
      data: {
        roles: ['admin', 'manager', 'agent'],
      },
    });
  }

  async getPermissions(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const user = request.user as { role?: string } | undefined;
    const role = user?.role || 'agent';
    const rolePermissionService = request.server.rolePermissionService;
    const rolePermissions = rolePermissionService
      ? await rolePermissionService.getPermissions(role)
      : getRolePermissions(role);

    reply.code(200).send({
      success: true,
      data: {
        role,
        permissions: rolePermissions,
        allPermissions: listAllPermissions(),
        uiPermissions: resolveUiPermissions(rolePermissions),
        uiPermissionGroups: listUiPermissionGroups(),
      },
    });
  }
}
