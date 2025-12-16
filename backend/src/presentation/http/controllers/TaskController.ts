import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateTaskUseCase } from '../../../application/use-cases/task/CreateTaskUseCase';
import { GetTaskUseCase } from '../../../application/use-cases/task/GetTaskUseCase';
import { ListTasksUseCase } from '../../../application/use-cases/task/ListTasksUseCase';
import { AssignTaskUseCase } from '../../../application/use-cases/task/AssignTaskUseCase';
import { UpdateTaskStatusUseCase } from '../../../application/use-cases/task/UpdateTaskStatusUseCase';
import { CompleteTaskUseCase } from '../../../application/use-cases/task/CompleteTaskUseCase';

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
    request: FastifyRequest<{
      Body: {
        title: string;
        description?: string;
        type?: string;
        assigneeId?: string;
        conversationId?: string;
        requirementId?: string;
        priority?: string;
        dueDate?: string;
        metadata?: Record<string, unknown>;
      };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.createTaskUseCase.execute(request.body);
      reply.code(201).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getTask(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.getTaskUseCase.execute({
        taskId: request.params.id,
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async listTasks(
    request: FastifyRequest<{
      Querystring: {
        assigneeId?: string;
        conversationId?: string;
        requirementId?: string;
        status?: string;
        priority?: string;
        page?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const query = request.query;
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
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async assignTask(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { assigneeId: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.assignTaskUseCase.execute({
        taskId: request.params.id,
        assigneeId: request.body.assigneeId,
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async updateStatus(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { status: 'pending' | 'in_progress' | 'completed' | 'cancelled' };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.updateTaskStatusUseCase.execute(
        request.params.id,
        request.body,
      );
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async completeTask(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        qualityScore?: {
          timeliness: number;
          completeness: number;
          satisfaction: number;
        };
      };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.completeTaskUseCase.execute(
        request.params.id,
        { qualityScore: request.body.qualityScore },
      );
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply): void {
    if (error instanceof Error) {
      const statusCode = this.getStatusCode(error.message);
      reply.code(statusCode).send({
        success: false,
        error: { message: error.message, code: this.getErrorCode(error.message) },
      });
      return;
    }

    reply.code(500).send({
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
}
