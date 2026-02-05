import { FastifyInstance } from 'fastify';

import { ReviewController } from '../controllers/ReviewController';

export function reviewRoutes(
  fastify: FastifyInstance,
  controller: ReviewController,
): void {
  fastify.post('/api/reviews', {
    config: { permissions: ['reviews.write'] },
  }, async (request, reply) => {
    await controller.createReview(request, reply);
  });

  fastify.get('/api/reviews/:id', {
    config: { permissions: ['reviews.read'] },
  }, async (request, reply) => {
    await controller.getReview(request, reply);
  });

  fastify.get('/api/reviews', {
    config: { permissions: ['reviews.read'] },
  }, async (request, reply) => {
    await controller.listReviews(request, reply);
  });

  fastify.post('/api/reviews/:id/complete', {
    config: { permissions: ['reviews.write'] },
  }, async (request, reply) => {
    await controller.completeReview(request, reply);
  });
}
