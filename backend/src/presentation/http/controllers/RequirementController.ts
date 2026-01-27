import { FastifyRequest, FastifyReply } from 'fastify';

import { CreateRequirementRequestDTO } from '../../../application/dto/requirement/CreateRequirementRequestDTO';
import { CreateRequirementUseCase } from '../../../application/use-cases/requirement/CreateRequirementUseCase';
import { DeleteRequirementUseCase } from '../../../application/use-cases/requirement/DeleteRequirementUseCase';
import { GetRequirementStatisticsUseCase } from '../../../application/use-cases/requirement/GetRequirementStatisticsUseCase';
import { GetRequirementUseCase } from '../../../application/use-cases/requirement/GetRequirementUseCase';
import { ListRequirementsUseCase } from '../../../application/use-cases/requirement/ListRequirementsUseCase';
import { UpdateRequirementStatusUseCase } from '../../../application/use-cases/requirement/UpdateRequirementStatusUseCase';
import { ForbiddenError } from '../../../application/services/ResourceAccessControl';
import { ValidationError } from '../../../infrastructure/validation/Validator';

export class RequirementController {
  constructor(
    private readonly createRequirementUseCase: CreateRequirementUseCase,
    private readonly getRequirementUseCase: GetRequirementUseCase,
    private readonly listRequirementsUseCase: ListRequirementsUseCase,
    private readonly updateRequirementStatusUseCase: UpdateRequirementStatusUseCase,
    private readonly deleteRequirementUseCase: DeleteRequirementUseCase,
    private readonly getRequirementStatisticsUseCase: GetRequirementStatisticsUseCase,
  ) {}

  async createRequirement(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const payload = request.body as CreateRequirementRequestDTO;
      const result = await this.createRequirementUseCase.execute(payload);
      reply.code(201).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getRequirement(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const result = await this.getRequirementUseCase.execute({
        requirementId: id,
        userId: this.getUserId(request),
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async listRequirements(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const query = request.query as {
        customerId?: string;
        conversationId?: string;
        status?: string;
        category?: string;
        priority?: string;
        page?: string;
        limit?: string;
      };
      const dto = {
        customerId: query.customerId,
        conversationId: query.conversationId,
        status: query.status,
        category: query.category,
        priority: query.priority,
        page: query.page ? Number.parseInt(query.page, 10) : undefined,
        limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
      };
      const result = await this.listRequirementsUseCase.execute(dto);
      reply.code(200).send({ success: true, data: result });
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
      const { status } = request.body as {
        status: 'pending' | 'approved' | 'resolved' | 'ignored' | 'cancelled';
      };
      const result = await this.updateRequirementStatusUseCase.execute({
        requirementId: id,
        status,
        userId: this.getUserId(request),
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async ignoreRequirement(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const result = await this.updateRequirementStatusUseCase.execute({
        requirementId: id,
        status: 'ignored',
        userId: this.getUserId(request),
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getStatistics(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.getRequirementStatisticsUseCase.execute();
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async deleteRequirement(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      await this.deleteRequirementUseCase.execute({
        requirementId: id,
        userId: this.getUserId(request),
      });
      reply.code(204).send();
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply): void {
    if (error instanceof ValidationError) {
      reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.errors,
        },
      });
      return;
    }
    if (error instanceof ForbiddenError) {
      reply.code(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      });
      return;
    }
    if (error instanceof Error) {
      const statusCode = this.getStatusCode(error.message);
      reply.code(statusCode).send({
        success: false,
        error: {
          code: this.getErrorCode(error.message),
          message: error.message,
        },
      });
      return;
    }

    reply.code(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
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
