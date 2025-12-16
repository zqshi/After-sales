import { FastifyInstance } from 'fastify';
import { RequirementController } from '../controllers/RequirementController';

export async function requirementRoutes(
  fastify: FastifyInstance,
  controller: RequirementController,
): Promise<void> {
  fastify.post('/api/requirements', async (request, reply) => {
    await controller.createRequirement(request, reply);
  });

  fastify.get('/api/requirements/:id', async (request, reply) => {
    await controller.getRequirement(request, reply);
  });

  fastify.get('/api/requirements', async (request, reply) => {
    await controller.listRequirements(request, reply);
  });

  fastify.patch('/api/requirements/:id/status', async (request, reply) => {
    await controller.updateStatus(request, reply);
  });

  fastify.delete('/api/requirements/:id', async (request, reply) => {
    await controller.deleteRequirement(request, reply);
  });
}
