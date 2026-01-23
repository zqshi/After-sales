import 'fastify';

import { RolePermissionService } from '../application/services/RolePermissionService';

declare module 'fastify' {
  interface FastifyInstance {
    rolePermissionService?: RolePermissionService;
  }
}
