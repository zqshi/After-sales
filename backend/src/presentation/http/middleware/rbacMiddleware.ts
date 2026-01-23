import { FastifyReply, FastifyRequest } from 'fastify';
import { getRolePermissions, PermissionKey } from '../../../config/permissions';

export async function rbacMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const config = request.routeOptions.config as {
    auth?: boolean;
    permissions?: PermissionKey[];
  } | undefined;

  if (request.method === 'OPTIONS') {
    return;
  }

  if (config?.auth === false) {
    return;
  }

  const required = config?.permissions || [];
  if (!required.length) {
    return;
  }

  const user = request.user as { role?: string } | undefined;
  if (!user?.role) {
    reply.code(403).send({
      success: false,
      error: 'Forbidden',
    });
    return;
  }

  const rolePermissionService = request.server.rolePermissionService;
  const availablePermissions = rolePermissionService
    ? await rolePermissionService.getPermissions(user.role)
    : getRolePermissions(user.role);
  const available = new Set(availablePermissions);
  const allowed = required.every((permission) => available.has(permission));

  if (!allowed) {
    reply.code(403).send({
      success: false,
      error: 'Insufficient permissions',
    });
  }
}
