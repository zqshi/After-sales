import { FastifyInstance } from 'fastify';
import { CustomerProfileController } from '../controllers/CustomerProfileController';
import { CustomerActionController } from '../controllers/CustomerActionController';

export async function customerRoutes(
  fastify: FastifyInstance,
  profileController: CustomerProfileController,
  actionController: CustomerActionController,
): Promise<void> {
  fastify.get('/api/customers/:id', {
    config: { permissions: ['customers.read'] },
  }, async (request, reply) => {
    await profileController.getProfile(request, reply);
  });

  fastify.post('/api/customers/:id/refresh', {
    config: { permissions: ['customers.write'] },
  }, async (request, reply) => {
    await profileController.refreshProfile(request, reply);
  });

  fastify.get('/api/customers/:id/interactions', {
    config: { permissions: ['customers.read'] },
  }, async (request, reply) => {
    await profileController.getInteractions(request, reply);
  });

  fastify.post('/api/customers/:id/service-records', {
    config: { permissions: ['customers.write'] },
  }, async (request, reply) => {
    await actionController.addServiceRecord(request, reply);
  });

  fastify.patch('/api/customers/:id/commitments/:commitmentId', {
    config: { permissions: ['customers.write'] },
  }, async (request, reply) => {
    await actionController.updateCommitment(request, reply);
  });

  fastify.post('/api/customers/:id/interactions', {
    config: { permissions: ['customers.write'] },
  }, async (request, reply) => {
    await actionController.addInteraction(request, reply);
  });

  fastify.post('/api/customers/:id/mark-vip', {
    config: { permissions: ['customers.write'] },
  }, async (request, reply) => {
    await actionController.markAsVIP(request, reply);
  });
}
