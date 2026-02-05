import { FastifyInstance } from 'fastify';

import { AuditController } from '../controllers/AuditController';

export function auditRoutes(
  fastify: FastifyInstance,
  controller: AuditController,
): void {
  fastify.post('/audit/events', {
    config: { permissions: ['audit.write'] },
  }, async (request, reply) => {
    await controller.createEvent(request, reply);
  });

  fastify.get('/audit/reports/summary', {
    config: { permissions: ['audit.read'] },
  }, async (request, reply) => {
    await controller.getSummary(request, reply);
  });
}
