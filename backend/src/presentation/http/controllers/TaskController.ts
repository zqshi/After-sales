import { FastifyRequest, FastifyReply } from 'fastify';

import { CreateTaskRequestDTO } from '../../../application/dto/task/CreateTaskRequestDTO';
import { ForbiddenError } from '../../../application/services/ResourceAccessControl';
import { AssignTaskUseCase } from '../../../application/use-cases/task/AssignTaskUseCase';
import { CompleteTaskUseCase } from '../../../application/use-cases/task/CompleteTaskUseCase';
import { CreateTaskUseCase } from '../../../application/use-cases/task/CreateTaskUseCase';
import { GetTaskUseCase } from '../../../application/use-cases/task/GetTaskUseCase';
import { ListTasksUseCase } from '../../../application/use-cases/task/ListTasksUseCase';
import { UpdateTaskStatusUseCase } from '../../../application/use-cases/task/UpdateTaskStatusUseCase';
import { ValidationError } from '../../../infrastructure/validation/Validator';

export class TaskController {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly getTaskUseCase: GetTaskUseCase,
    private readonly listTasksUseCase: ListTasksUseCase,
    private readonly assignTaskUseCase: AssignTaskUseCase,
    private readonly updateTaskStatusUseCase: UpdateTaskStatusUseCase,
    private readonly completeTaskUseCase: CompleteTaskUseCase,
  ) {}

  async createTask(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const payload = request.body as CreateTaskRequestDTO;
      const result = await this.createTaskUseCase.execute(payload);
      void reply.code(201).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getTask(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const result = await this.getTaskUseCase.execute({
        taskId: id,
        userId: this.getUserId(request),
      });
      void reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async listTasks(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const query = request.query as {
        assigneeId?: string;
        conversationId?: string;
        requirementId?: string;
        status?: string;
        priority?: string;
        page?: string;
        limit?: string;
      };
      const dto = {
        assigneeId: query.assigneeId,
        conversationId: query.conversationId,
        requirementId: query.requirementId,
        status: query.status,
        priority: query.priority,
        page: query.page ? Number.parseInt(query.page, 10) : undefined,
        limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
      };
      const result = await this.listTasksUseCase.execute(dto);
      void reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async assignTask(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const { assigneeId } = request.body as { assigneeId: string };
      const result = await this.assignTaskUseCase.execute({
        taskId: id,
        assigneeId,
        userId: this.getUserId(request),
      });
      void reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async updateStatus(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { status: 'pending' | 'in_progress' | 'completed' | 'cancelled' };
      const result = await this.updateTaskStatusUseCase.execute({
        taskId: id,
        status: body.status,
        userId: this.getUserId(request),
      });
      void reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async completeTask(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as {
        qualityScore?: {
          timeliness: number;
          completeness: number;
          satisfaction: number;
        };
      };
      const result = await this.completeTaskUseCase.execute({
        taskId: id,
        qualityScore: body.qualityScore,
        userId: this.getUserId(request),
      });
      void reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async handleAction(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const { action } = request.body as { action: string };

      if (!action) {
        void reply.code(400).send({
          success: false,
          error: { message: 'action is required', code: 'VALIDATION_ERROR' },
        });
        return;
      }

      if (action === 'cancel') {
        const result = await this.updateTaskStatusUseCase.execute({
          taskId: id,
          status: 'cancelled',
          userId: this.getUserId(request),
        });
        void reply.code(200).send({ success: true, data: result });
        return;
      }

      if (action === 'execute') {
        const result = await this.updateTaskStatusUseCase.execute({
          taskId: id,
          status: 'in_progress',
          userId: this.getUserId(request),
        });
        void reply.code(200).send({ success: true, data: result });
        return;
      }

      void reply.code(400).send({
        success: false,
        error: { message: `unsupported action: ${action}`, code: 'INVALID_INPUT' },
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply): void {
    if (error instanceof ValidationError) {
      void reply.code(400).send({
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
      void reply.code(403).send({
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
      void reply.code(statusCode).send({
        success: false,
        error: { message: error.message, code: this.getErrorCode(error.message) },
      });
      return;
    }

    void reply.code(500).send({
      success: false,
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
    });
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
