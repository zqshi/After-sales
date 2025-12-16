import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateRequirementUseCase } from '../../../application/use-cases/requirement/CreateRequirementUseCase';
import { GetRequirementUseCase } from '../../../application/use-cases/requirement/GetRequirementUseCase';
import { ListRequirementsUseCase } from '../../../application/use-cases/requirement/ListRequirementsUseCase';
import { UpdateRequirementStatusUseCase } from '../../../application/use-cases/requirement/UpdateRequirementStatusUseCase';
import { DeleteRequirementUseCase } from '../../../application/use-cases/requirement/DeleteRequirementUseCase';

export class RequirementController {
  constructor(
    private readonly createRequirementUseCase: CreateRequirementUseCase,
    private readonly getRequirementUseCase: GetRequirementUseCase,
    private readonly listRequirementsUseCase: ListRequirementsUseCase,
    private readonly updateRequirementStatusUseCase: UpdateRequirementStatusUseCase,
    private readonly deleteRequirementUseCase: DeleteRequirementUseCase,
  ) {}

  async createRequirement(
    request: FastifyRequest<{
      Body: {
        customerId: string;
        conversationId?: string;
        title: string;
        description?: string;
        category: string;
        priority?: string;
        source?: string;
        createdBy?: string;
        metadata?: Record<string, unknown>;
      };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.createRequirementUseCase.execute(request.body);
      reply.code(201).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getRequirement(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.getRequirementUseCase.execute({
        requirementId: request.params.id,
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async listRequirements(
    request: FastifyRequest<{
      Querystring: {
        customerId?: string;
        conversationId?: string;
        status?: string;
        category?: string;
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
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        status: 'pending' | 'approved' | 'resolved' | 'ignored' | 'cancelled';
      };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params;
      const { status } = request.body;
      const result = await this.updateRequirementStatusUseCase.execute({
        requirementId: id,
        status,
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async deleteRequirement(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      await this.deleteRequirementUseCase.execute({
        requirementId: request.params.id,
      });
      reply.code(204).send();
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply): void {
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
}
