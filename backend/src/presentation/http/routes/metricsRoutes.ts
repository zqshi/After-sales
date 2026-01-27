/**
 * Metrics路由 - 提供Prometheus指标端点
 */

import { FastifyInstance } from 'fastify';

import { metricsCollector } from '../../../infrastructure/monitoring/MetricsCollector';

export default async function metricsRoutes(fastify: FastifyInstance) {
  /**
   * GET /metrics
   * Prometheus指标端点
   */
  fastify.get('/metrics', {
    config: { permissions: ['monitoring.read'] },
  }, async (request, reply) => {
    try {
      const metrics = await metricsCollector.getMetrics();

      reply
        .code(200)
        .header('Content-Type', metricsCollector.getContentType())
        .send(metrics);
    } catch (err) {
      console.error('[MetricsRoute] Failed to generate metrics:', err);
      reply.code(500).send({
        error: 'Failed to generate metrics',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /health
   * 健康检查端点
   */
  fastify.get('/health', {
    config: { auth: false },
  }, async (request, reply) => {
    reply.code(200).send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    });
  });
}
