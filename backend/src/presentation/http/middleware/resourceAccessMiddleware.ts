import { FastifyRequest, FastifyReply } from 'fastify';

import { ResourceAccessControl, ForbiddenError } from '@application/services/ResourceAccessControl';

/**
 * 资源访问控制中间件
 *
 * 自动检查用户是否有权访问请求的资源
 */
export class ResourceAccessMiddleware {
  constructor(private readonly accessControl: ResourceAccessControl) {}

  /**
   * 检查对话访问权限
   */
  checkConversationAccess(action: 'read' | 'write' | 'delete' = 'read') {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const user = request.user as { sub: string } | undefined;
        if (!user) {
          reply.code(401).send({ success: false, error: 'Unauthorized' });
          return;
        }

        const conversationId = (request.params as { id?: string }).id;
        if (!conversationId) {
          reply.code(400).send({ success: false, error: 'Conversation ID required' });
          return;
        }

        await this.accessControl.checkConversationAccess(user.sub, conversationId, action);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
          return;
        }
        if (error instanceof Error && error.message.startsWith('Conversation not found')) {
          reply.code(404).send({ success: false, error: error.message });
          return;
        }
        throw error;
      }
    };
  }

  /**
   * 检查任务访问权限
   */
  checkTaskAccess(action: 'read' | 'write' | 'delete' = 'read') {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const user = request.user as { sub: string } | undefined;
        if (!user) {
          reply.code(401).send({ success: false, error: 'Unauthorized' });
          return;
        }

        const taskId = (request.params as { id?: string }).id;
        if (!taskId) {
          reply.code(400).send({ success: false, error: 'Task ID required' });
          return;
        }

        await this.accessControl.checkTaskAccess(user.sub, taskId, action);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
          return;
        }
        if (error instanceof Error && error.message.startsWith('Task not found')) {
          reply.code(404).send({ success: false, error: error.message });
          return;
        }
        throw error;
      }
    };
  }

  /**
   * 检查需求访问权限
   */
  checkRequirementAccess(action: 'read' | 'write' | 'delete' = 'read') {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const user = request.user as { sub: string } | undefined;
        if (!user) {
          reply.code(401).send({ success: false, error: 'Unauthorized' });
          return;
        }

        const requirementId = (request.params as { id?: string }).id;
        if (!requirementId) {
          reply.code(400).send({ success: false, error: 'Requirement ID required' });
          return;
        }

        await this.accessControl.checkRequirementAccess(user.sub, requirementId, action);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
          return;
        }
        if (error instanceof Error && error.message.startsWith('Requirement not found')) {
          reply.code(404).send({ success: false, error: error.message });
          return;
        }
        throw error;
      }
    };
  }
}
