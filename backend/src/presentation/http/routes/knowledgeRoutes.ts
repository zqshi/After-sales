import { FastifyInstance } from 'fastify';
import { KnowledgeController } from '../controllers/KnowledgeController';

export async function knowledgeRoutes(
  fastify: FastifyInstance,
  controller: KnowledgeController,
): Promise<void> {
  fastify.post('/api/knowledge', async (request, reply) => {
    await controller.create(request, reply);
  });

  fastify.get('/api/knowledge/:id', async (request, reply) => {
    await controller.get(request, reply);
  });

  fastify.get('/api/knowledge', async (request, reply) => {
    await controller.list(request, reply);
  });

  fastify.patch('/api/knowledge/:id', async (request, reply) => {
    await controller.update(request, reply);
  });

  fastify.delete('/api/knowledge/:id', async (request, reply) => {
    await controller.delete(request, reply);
  });
}
