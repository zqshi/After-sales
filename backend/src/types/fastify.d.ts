import 'fastify';

import { RolePermissionService } from '../application/services/RolePermissionService';

declare module 'fastify' {
  interface FastifyInstance {
    rolePermissionService?: RolePermissionService;
  }

  interface FastifyContextConfig {
    auth?: boolean;
    audit?: boolean;
    permissions?: string[];
  }

  interface RouteShorthandOptions {
    websocket?: boolean;
  }
}
