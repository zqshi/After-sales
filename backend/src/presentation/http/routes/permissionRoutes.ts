import { FastifyInstance } from 'fastify';
import { PermissionController } from '../controllers/PermissionController';

export async function permissionRoutes(
  fastify: FastifyInstance,
  controller: PermissionController,
): Promise<void> {
  fastify.get('/api/roles', {
    config: { permissions: ['session.read'] },
  }, async (request, reply) => {
    await controller.listRoles(request, reply);
  });

  fastify.post('/api/roles', {
    config: { permissions: ['session.write'] },
  }, async (request, reply) => {
    await controller.createRole(request, reply);
  });

  fastify.patch('/api/roles/:id', {
    config: { permissions: ['session.write'] },
  }, async (request, reply) => {
    await controller.updateRole(request, reply);
  });

  fastify.delete('/api/roles/:id', {
    config: { permissions: ['session.write'] },
  }, async (request, reply) => {
    await controller.deleteRole(request, reply);
  });

  fastify.get('/api/members', {
    config: { permissions: ['session.read'] },
  }, async (request, reply) => {
    await controller.listMembers(request, reply);
  });

  fastify.post('/api/members', {
    config: { permissions: ['session.write'] },
  }, async (request, reply) => {
    await controller.createMember(request, reply);
  });

  fastify.patch('/api/members/:id', {
    config: { permissions: ['session.write'] },
  }, async (request, reply) => {
    await controller.updateMember(request, reply);
  });

  fastify.delete('/api/members/:id', {
    config: { permissions: ['session.write'] },
  }, async (request, reply) => {
    await controller.deleteMember(request, reply);
  });
}
