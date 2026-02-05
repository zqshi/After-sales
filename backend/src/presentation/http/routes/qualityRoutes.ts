import { FastifyInstance } from 'fastify';

import { QualityController } from '../controllers/QualityController';

export function qualityRoutes(
  fastify: FastifyInstance,
  controller: QualityController,
): void {
  fastify.get('/api/quality/:conversationId', {
    config: { permissions: ['quality.read'] },
  }, async (request, reply) => {
    await controller.getLatestByConversation(request, reply);
  });

  fastify.get('/api/quality/:conversationId/reports', {
    config: { permissions: ['quality.read'] },
  }, async (request, reply) => {
    await controller.listByConversation(request, reply);
  });

  fastify.get('/api/quality/reports', {
    config: { permissions: ['quality.read'] },
  }, async (request, reply) => {
    await controller.listLatest(request, reply);
  });
}
