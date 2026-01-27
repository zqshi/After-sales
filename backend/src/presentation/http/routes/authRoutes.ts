import { FastifyInstance } from 'fastify';

import { AuthController } from '../controllers/AuthController';

export async function authRoutes(
  fastify: FastifyInstance,
  controller: AuthController,
): Promise<void> {
  fastify.post('/api/auth/login', {
    config: { auth: false },
  }, async (request, reply) => {
    await controller.login(request, reply);
  });

  fastify.post('/api/auth/register', {
    config: { auth: false },
  }, async (request, reply) => {
    await controller.register(request, reply);
  });

  fastify.get('/api/auth/me', {
    config: { permissions: ['session.read'] },
  }, async (request, reply) => {
    await controller.me(request, reply);
  });
}
