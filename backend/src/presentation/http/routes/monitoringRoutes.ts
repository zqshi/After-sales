import { FastifyInstance } from 'fastify';
import { MonitoringController } from '../controllers/MonitoringController';

export async function monitoringRoutes(
  fastify: FastifyInstance,
  controller: MonitoringController,
): Promise<void> {
  fastify.get('/monitoring/alerts', {
    config: { permissions: ['monitoring.read'] },
  }, async (request, reply) => {
    await controller.listAlerts(request, reply);
  });

  fastify.post('/monitoring/alerts', {
    config: { permissions: ['monitoring.write'] },
  }, async (request, reply) => {
    await controller.createAlert(request, reply);
  });

  fastify.patch('/monitoring/alerts/:id/resolve', {
    config: { permissions: ['monitoring.write'] },
  }, async (request, reply) => {
    await controller.resolveAlert(request, reply);
  });
}
