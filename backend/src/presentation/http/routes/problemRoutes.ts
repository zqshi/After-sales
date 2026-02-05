import { FastifyInstance } from 'fastify';

import { ProblemController } from '../controllers/ProblemController';

export function problemRoutes(
  fastify: FastifyInstance,
  controller: ProblemController,
): void {
  fastify.post('/api/problems', {
    config: { permissions: ['problems.write'] },
  }, async (request, reply) => {
    await controller.createProblem(request, reply);
  });

  fastify.get('/api/problems/:id', {
    config: { permissions: ['problems.read'] },
  }, async (request, reply) => {
    await controller.getProblem(request, reply);
  });

  fastify.get('/api/problems', {
    config: { permissions: ['problems.read'] },
  }, async (request, reply) => {
    await controller.listProblems(request, reply);
  });

  fastify.patch('/api/problems/:id/status', {
    config: { permissions: ['problems.write'] },
  }, async (request, reply) => {
    await controller.updateStatus(request, reply);
  });
}
