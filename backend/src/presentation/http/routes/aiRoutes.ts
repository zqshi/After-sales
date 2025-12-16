import { FastifyInstance } from 'fastify';
import { AiController } from '../controllers/AiController';

export async function aiRoutes(
  fastify: FastifyInstance,
  controller: AiController,
): Promise<void> {
  fastify.post('/ai/analyze', async (request, reply) => {
    await controller.analyze(request, reply);
  });

  fastify.post('/ai/solutions', async (request, reply) => {
    await controller.applySolution(request, reply);
  });
}
