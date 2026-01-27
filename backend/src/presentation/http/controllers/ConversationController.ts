/**
 * ConversationController - 对话HTTP控制器
 *
 * 处理HTTP请求并调用Use Cases
 */

import { FastifyRequest, FastifyReply } from 'fastify';

import {
  ConversationListQueryDTO,
  ConversationListStatus,
  ConversationCustomerLevelStatus,
} from '../../../application/dto/ConversationListQueryDTO';
import { CreateConversationRequestDTO } from '../../../application/dto/CreateConversationRequestDTO';
import { AssignAgentUseCase } from '../../../application/use-cases/AssignAgentUseCase';
import { CloseConversationUseCase } from '../../../application/use-cases/CloseConversationUseCase';
import { CreateConversationUseCase } from '../../../application/use-cases/CreateConversationUseCase';
import { GetConversationUseCase } from '../../../application/use-cases/GetConversationUseCase';
import { ListConversationsUseCase } from '../../../application/use-cases/ListConversationsUseCase';
import { SendMessageUseCase } from '../../../application/use-cases/SendMessageUseCase';
import { ForbiddenError } from '../../../application/services/ResourceAccessControl';
import { ValidationError } from '../../../infrastructure/validation/Validator';

export class ConversationController {
  constructor(
    private readonly createConversationUseCase: CreateConversationUseCase,
    private readonly listConversationsUseCase: ListConversationsUseCase,
    private readonly assignAgentUseCase: AssignAgentUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly closeConversationUseCase: CloseConversationUseCase,
    private readonly getConversationUseCase: GetConversationUseCase,
  ) {}

  /**
   * POST /api/conversations
   * 创建对话
   */
  async createConversation(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const payload = request.body as CreateConversationRequestDTO;
      const result = await this.createConversationUseCase.execute(payload);

      reply.code(201).send({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  /**
   * GET /api/conversations
   * 查询对话列表
   */
  async listConversations(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const query = request.query as {
        status?: string;
        agentId?: string;
        customerId?: string;
        channel?: string;
        slaStatus?: string;
        page?: string;
        limit?: string;
      };
      const dto: ConversationListQueryDTO = {
        status: query.status as ConversationListStatus,
        agentId: query.agentId,
        customerId: query.customerId,
        channel: query.channel,
        slaStatus: query.slaStatus as ConversationCustomerLevelStatus,
        page: this.parseNumberParam(query.page),
        limit: this.parseNumberParam(query.limit),
      };

      const result = await this.listConversationsUseCase.execute(dto);

      reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  /**
   * POST /api/conversations/:id/assign
   * 分配客服
   */
  async assignAgent(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const { agentId, assignedBy, reason } = request.body as {
        agentId: string;
        assignedBy?: string;
        reason?: 'manual' | 'auto' | 'reassign';
      };

      const result = await this.assignAgentUseCase.execute({
        conversationId: id,
        agentId,
        assignedBy,
        reason,
        userId: this.getUserId(request),
      });

      reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  /**
   * POST /api/conversations/:id/messages
   * 发送消息
   */
  async sendMessage(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id: conversationId } = request.params as { id: string };
      const { senderId, senderType, content } = request.body as {
        senderId: string;
        senderType: 'internal' | 'external';
        content: string;
      };

      const result = await this.sendMessageUseCase.execute({
        conversationId,
        senderId,
        senderType,
        content,
      });

      reply.code(201).send({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  /**
   * POST /api/conversations/:id/close
   * 关闭对话
   */
  async closeConversation(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id: conversationId } = request.params as { id: string };
      const { closedBy, reason } = request.body as {
        closedBy: string;
        reason?: string;
      };

      const result = await this.closeConversationUseCase.execute({
        conversationId,
        closedBy,
        reason,
        userId: this.getUserId(request),
      });

      reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  /**
   * GET /api/conversations/:id
   * 获取对话详情
   */
  async getConversation(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id: conversationId } = request.params as { id: string };
      const query = request.query as { includeMessages?: string };
      const includeMessages = query.includeMessages !== 'false';

      const result = await this.getConversationUseCase.execute({
        conversationId,
        includeMessages,
        userId: this.getUserId(request),
      });

      reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private parseNumberParam(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  /**
   * 错误处理
   */
  private handleError(error: unknown, reply: FastifyReply): void {
    if (error instanceof ValidationError) {
      reply.code(400).send({
        success: false,
        error: {
          message: error.message,
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
      return;
    }
    if (error instanceof ForbiddenError) {
      reply.code(403).send({
        success: false,
        error: {
          message: error.message,
          code: 'FORBIDDEN',
        },
      });
      return;
    }
    if (error instanceof Error) {
      const statusCode = this.getStatusCode(error.message);
      reply.code(statusCode).send({
        success: false,
        error: {
          message: error.message,
          code: this.getErrorCode(error.message),
        },
      });
    } else {
      reply.code(500).send({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      });
    }
  }

  private getStatusCode(message: string): number {
    if (message.includes('not found')) {
      return 404;
    }
    if (message.includes('required') || message.includes('invalid')) {
      return 400;
    }
    return 500;
  }

  private getErrorCode(message: string): string {
    if (message.includes('not found')) {
      return 'NOT_FOUND';
    }
    if (message.includes('required')) {
      return 'VALIDATION_ERROR';
    }
    if (message.includes('invalid')) {
      return 'INVALID_INPUT';
    }
    return 'INTERNAL_ERROR';
  }

  private getUserId(request: FastifyRequest): string | undefined {
    const user = request.user as { sub?: string } | undefined;
    return user?.sub;
  }
}
