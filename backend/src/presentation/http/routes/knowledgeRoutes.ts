import { FastifyInstance } from 'fastify';
import { KnowledgeController } from '../controllers/KnowledgeController';

export async function knowledgeRoutes(
  fastify: FastifyInstance,
  controller: KnowledgeController,
): Promise<void> {
  fastify.post('/api/knowledge/search', async (request, reply) => {
    await controller.search(request, reply);
  });

  fastify.post('/api/knowledge/upload', async (request, reply) => {
    await controller.upload(request, reply);
  });

  fastify.get('/api/knowledge/:id/progress', async (request, reply) => {
    await controller.getProgress(request, reply);
  });

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
