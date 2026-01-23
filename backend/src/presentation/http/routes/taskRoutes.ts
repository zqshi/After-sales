import { FastifyInstance } from 'fastify';
import { TaskController } from '../controllers/TaskController';

export async function taskRoutes(
  fastify: FastifyInstance,
  controller: TaskController,
): Promise<void> {
  fastify.post('/api/tasks', {
    config: { permissions: ['tasks.write'] },
  }, async (request, reply) => {
    await controller.createTask(request, reply);
  });

  fastify.get('/api/tasks/:id', {
    config: { permissions: ['tasks.read'] },
  }, async (request, reply) => {
    await controller.getTask(request, reply);
  });

  fastify.get('/api/tasks', {
    config: { permissions: ['tasks.read'] },
  }, async (request, reply) => {
    await controller.listTasks(request, reply);
  });

  fastify.post('/api/tasks/:id/assign', {
    config: { permissions: ['tasks.assign'] },
  }, async (request, reply) => {
    await controller.assignTask(request, reply);
  });

  fastify.patch('/api/tasks/:id/status', {
    config: { permissions: ['tasks.write'] },
  }, async (request, reply) => {
    await controller.updateStatus(request, reply);
  });

  fastify.post('/api/tasks/:id/complete', {
    config: { permissions: ['tasks.complete'] },
  }, async (request, reply) => {
    await controller.completeTask(request, reply);
  });

  fastify.post('/api/tasks/:id/actions', {
    config: { permissions: ['tasks.write'] },
  }, async (request, reply) => {
    await controller.handleAction(request, reply);
  });
}
