import { FastifyInstance } from 'fastify';
import { KnowledgeController } from '../controllers/KnowledgeController';

export async function knowledgeRoutes(
  fastify: FastifyInstance,
  controller: KnowledgeController,
): Promise<void> {
  fastify.post('/api/knowledge/search', {
    config: { permissions: ['knowledge.read'] },
  }, async (request, reply) => {
    await controller.search(request, reply);
  });

  fastify.post('/api/knowledge/upload', {
    config: { permissions: ['knowledge.write'] },
  }, async (request, reply) => {
    await controller.upload(request, reply);
  });

  fastify.get('/api/knowledge/:id/progress', {
    config: { permissions: ['knowledge.read'] },
  }, async (request, reply) => {
    await controller.getProgress(request, reply);
  });

  fastify.post('/api/knowledge/:id/sync', {
    config: { permissions: ['knowledge.write'] },
  }, async (request, reply) => {
    await controller.sync(request, reply);
  });

  fastify.post('/api/knowledge/:id/retry', {
    config: { permissions: ['knowledge.write'] },
  }, async (request, reply) => {
    await controller.retry(request, reply);
  });

  fastify.post('/api/knowledge', {
    config: { permissions: ['knowledge.write'] },
  }, async (request, reply) => {
    await controller.create(request, reply);
  });

  fastify.get('/api/knowledge/:id', {
    config: { permissions: ['knowledge.read'] },
  }, async (request, reply) => {
    await controller.get(request, reply);
  });

  fastify.get('/api/knowledge', {
    config: { permissions: ['knowledge.read'] },
  }, async (request, reply) => {
    await controller.list(request, reply);
  });

  fastify.patch('/api/knowledge/:id', {
    config: { permissions: ['knowledge.write'] },
  }, async (request, reply) => {
    await controller.update(request, reply);
  });

  fastify.delete('/api/knowledge/:id', {
    config: { permissions: ['knowledge.write'] },
  }, async (request, reply) => {
    await controller.delete(request, reply);
  });
}
