import { FastifyInstance } from 'fastify';

import { AiController } from '../controllers/AiController';

export async function aiRoutes(
  fastify: FastifyInstance,
  controller: AiController,
): Promise<void> {
  fastify.post('/ai/analyze', {
    config: { permissions: ['ai.use'] },
  }, async (request, reply) => {
    await controller.analyze(request, reply);
  });

  fastify.post('/ai/solutions', {
    config: { permissions: ['ai.use'] },
  }, async (request, reply) => {
    await controller.applySolution(request, reply);
  });
}
