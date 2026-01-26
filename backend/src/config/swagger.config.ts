/**
 * Swagger配置
 *
 * 自动生成API文档
 */

import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function registerSwagger(fastify: FastifyInstance): Promise<void> {
  // 注册Swagger插件
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: '智能售后工作台 API',
        description: '多渠道客户对话管理、质量检查、需求采集和AI辅助平台',
        version: '0.1.0',
        contact: {
          name: 'API Support',
          email: 'support@example.com',
        },
      },
      servers: [
        {
          url: 'http://localhost:8080',
          description: '开发环境',
        },
        {
          url: 'https://api.example.com',
          description: '生产环境',
        },
      ],
      tags: [
        { name: 'Auth', description: '认证授权' },
        { name: 'Conversations', description: '对话管理' },
        { name: 'Customers', description: '客户管理' },
        { name: 'Requirements', description: '需求管理' },
        { name: 'Tasks', description: '任务管理' },
        { name: 'Knowledge', description: '知识库管理' },
        { name: 'AI', description: 'AI服务' },
        { name: 'IM', description: 'IM消息接入' },
        { name: 'Audit', description: '审计日志' },
        { name: 'Permissions', description: '权限管理' },
        { name: 'Monitoring', description: '监控告警' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT认证令牌',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
          SuccessResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
            },
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
  });

  // 注册Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  console.log('✅ Swagger文档已配置: http://localhost:8080/docs');
}
