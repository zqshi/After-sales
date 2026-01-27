/**
 * Metrics中间件 - 自动收集HTTP请求指标
 */

import { FastifyRequest, FastifyReply } from 'fastify';

import { metricsCollector } from '../../../infrastructure/monitoring/MetricsCollector';

/**
 * Metrics中间件 - onRequest hook
 * 记录请求开始时间
 */
export function metricsMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void,
) {
  // 记录请求开始时间
  (request as any).startTime = Date.now();
  done();
}

/**
 * Metrics响应hook - onResponse hook
 * 在响应完成时记录指标
 */
export function metricsResponseHook(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void,
) {
  const startTime = (request as any).startTime || Date.now();
  const duration = Date.now() - startTime;
  const method = request.method;
  const route = request.routeOptions?.url || request.url;
  const statusCode = reply.statusCode;

  metricsCollector.recordHttpRequest(method, route, statusCode, duration);
  done();
}
