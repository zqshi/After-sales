import { FastifyInstance } from 'fastify';
import { TaskController } from '../controllers/TaskController';

export async function taskRoutes(
  fastify: FastifyInstance,
  controller: TaskController,
): Promise<void> {
  fastify.post('/api/tasks', async (request, reply) => {
    await controller.createTask(request, reply);
  });

  fastify.get('/api/tasks/:id', async (request, reply) => {
    await controller.getTask(request, reply);
  });

  fastify.get('/api/tasks', async (request, reply) => {
    await controller.listTasks(request, reply);
  });

  fastify.post('/api/tasks/:id/assign', async (request, reply) => {
    await controller.assignTask(request, reply);
  });

  fastify.patch('/api/tasks/:id/status', async (request, reply) => {
    await controller.updateStatus(request, reply);
  });

  fastify.post('/api/tasks/:id/complete', async (request, reply) => {
    await controller.completeTask(request, reply);
  });
}
