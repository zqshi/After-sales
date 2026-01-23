import { FastifyInstance } from 'fastify';
import { RequirementController } from '../controllers/RequirementController';

export async function requirementRoutes(
  fastify: FastifyInstance,
  controller: RequirementController,
): Promise<void> {
  fastify.post('/api/requirements', {
    config: { permissions: ['requirements.write'] },
  }, async (request, reply) => {
    await controller.createRequirement(request, reply);
  });

  fastify.get('/api/requirements/:id', {
    config: { permissions: ['requirements.read'] },
  }, async (request, reply) => {
    await controller.getRequirement(request, reply);
  });

  fastify.get('/api/requirements', {
    config: { permissions: ['requirements.read'] },
  }, async (request, reply) => {
    await controller.listRequirements(request, reply);
  });

  fastify.get('/api/requirements/statistics', {
    config: { permissions: ['requirements.read'] },
  }, async (request, reply) => {
    await controller.getStatistics(request, reply);
  });

  fastify.patch('/api/requirements/:id/status', {
    config: { permissions: ['requirements.write'] },
  }, async (request, reply) => {
    await controller.updateStatus(request, reply);
  });

  fastify.post('/api/requirements/:id/ignore', {
    config: { permissions: ['requirements.write'] },
  }, async (request, reply) => {
    await controller.ignoreRequirement(request, reply);
  });

  fastify.delete('/api/requirements/:id', {
    config: { permissions: ['requirements.delete'] },
  }, async (request, reply) => {
    await controller.deleteRequirement(request, reply);
  });
}
