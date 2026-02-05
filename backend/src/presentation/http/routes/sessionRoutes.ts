import { FastifyInstance } from 'fastify';

import { SessionController } from '../controllers/SessionController';

export function sessionRoutes(
  fastify: FastifyInstance,
  controller: SessionController,
): void {
  fastify.get('/session/roles', {
    config: { permissions: ['session.read'] },
  }, async (request, reply) => {
    await controller.getRoles(request, reply);
  });

  fastify.get('/session/permissions', {
    config: { permissions: ['session.read'] },
  }, async (request, reply) => {
    await controller.getPermissions(request, reply);
  });
}
