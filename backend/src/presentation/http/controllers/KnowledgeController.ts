import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateKnowledgeItemUseCase } from '../../../application/use-cases/knowledge/CreateKnowledgeItemUseCase';
import { GetKnowledgeItemUseCase } from '../../../application/use-cases/knowledge/GetKnowledgeItemUseCase';
import { ListKnowledgeItemsUseCase } from '../../../application/use-cases/knowledge/ListKnowledgeItemsUseCase';
import { UpdateKnowledgeItemUseCase } from '../../../application/use-cases/knowledge/UpdateKnowledgeItemUseCase';
import { DeleteKnowledgeItemUseCase } from '../../../application/use-cases/knowledge/DeleteKnowledgeItemUseCase';

export class KnowledgeController {
  constructor(
    private readonly createUseCase: CreateKnowledgeItemUseCase,
    private readonly getUseCase: GetKnowledgeItemUseCase,
    private readonly listUseCase: ListKnowledgeItemsUseCase,
    private readonly updateUseCase: UpdateKnowledgeItemUseCase,
    private readonly deleteUseCase: DeleteKnowledgeItemUseCase,
  ) {}

  async create(
    request: FastifyRequest<{
      Body: {
        title: string;
        content: string;
        category: string;
        tags?: string[];
        source: string;
        metadata?: Record<string, unknown>;
      };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.createUseCase.execute(request.body);
      reply.code(201).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async get(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.getUseCase.execute({ knowledgeId: request.params.id });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async list(
    request: FastifyRequest<{
      Querystring: {
        category?: string;
        source?: string;
        tags?: string;
        query?: string;
        page?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const query = request.query;
      const dto = {
        category: query.category,
        source: query.source,
        tags: query.tags,
        query: query.query,
        page: query.page ? Number.parseInt(query.page, 10) : undefined,
        limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
      };
      const result = await this.listUseCase.execute(dto);
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async update(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        title?: string;
        content?: string;
        category?: string;
        tags?: string[];
        metadata?: Record<string, unknown>;
      };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.updateUseCase.execute({
        knowledgeId: request.params.id,
        ...request.body,
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      await this.deleteUseCase.execute({ knowledgeId: request.params.id });
      reply.code(204).send();
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply): void {
    if (error instanceof Error) {
      const status = this.getStatus(error.message);
      reply.code(status).send({
        success: false,
        error: { message: error.message, code: this.getCode(error.message) },
      });
      return;
    }
    reply.code(500).send({
      success: false,
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
    });
  }

  private getStatus(message: string): number {
    if (message.includes('not found')) {
      return 404;
    }
    if (message.includes('required') || message.includes('invalid')) {
      return 400;
    }
    return 500;
  }

  private getCode(message: string): string {
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
