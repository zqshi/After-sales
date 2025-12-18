import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateKnowledgeItemUseCase } from '../../../application/use-cases/knowledge/CreateKnowledgeItemUseCase';
import { GetKnowledgeItemUseCase } from '../../../application/use-cases/knowledge/GetKnowledgeItemUseCase';
import { ListKnowledgeItemsUseCase } from '../../../application/use-cases/knowledge/ListKnowledgeItemsUseCase';
import {
  SearchKnowledgeRequest,
  SearchKnowledgeUseCase,
} from '../../../application/use-cases/knowledge/SearchKnowledgeUseCase';
import { UploadDocumentUseCase } from '../../../application/use-cases/knowledge/UploadDocumentUseCase';
import { UpdateKnowledgeItemUseCase } from '../../../application/use-cases/knowledge/UpdateKnowledgeItemUseCase';
import { DeleteKnowledgeItemUseCase } from '../../../application/use-cases/knowledge/DeleteKnowledgeItemUseCase';
import { TaxKBAdapter } from '../../../infrastructure/adapters/TaxKBAdapter';

export class KnowledgeController {
  constructor(
    private readonly createUseCase: CreateKnowledgeItemUseCase,
    private readonly getUseCase: GetKnowledgeItemUseCase,
    private readonly listUseCase: ListKnowledgeItemsUseCase,
    private readonly updateUseCase: UpdateKnowledgeItemUseCase,
    private readonly deleteUseCase: DeleteKnowledgeItemUseCase,
    private readonly searchKnowledgeUseCase: SearchKnowledgeUseCase,
    private readonly uploadDocumentUseCase: UploadDocumentUseCase,
    private readonly taxkbAdapter: TaxKBAdapter,
  ) {}

  async create(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const payload = request.body as {
        title: string;
        content: string;
        category: string;
        tags?: string[];
        source: string;
        metadata?: Record<string, unknown>;
      };
      const result = await this.createUseCase.execute(payload);
      reply.code(201).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async get(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const result = await this.getUseCase.execute({ knowledgeId: id });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async list(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const query = request.query as {
        category?: string;
        source?: string;
        tags?: string;
        query?: string;
        page?: string;
        limit?: string;
      };
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
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const payload = request.body as {
        title?: string;
        content?: string;
        category?: string;
        tags?: string[];
        metadata?: Record<string, unknown>;
      };
      const result = await this.updateUseCase.execute({
        knowledgeId: id,
        ...payload,
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async delete(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      await this.deleteUseCase.execute({ knowledgeId: id });
      reply.code(204).send();
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async search(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const payload = request.body as SearchKnowledgeRequest;
      const results = await this.searchKnowledgeUseCase.execute(payload);
      reply.code(200).send({ success: true, data: results });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async upload(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const file = await request.file();
      if (!file) {
        throw new Error('No file uploaded');
      }

      const buffer = await file.toBuffer();
      const body = request.body as Record<string, unknown>;
      const category = typeof body?.category === 'string' ? body.category : undefined;
      const companyEntity =
        typeof body?.companyEntity === 'string' ? body.companyEntity : undefined;

      const docId = await this.uploadDocumentUseCase.execute({
        file: buffer,
        title: file.filename,
        category,
        companyEntity,
      });

      reply.code(201).send({
        success: true,
        data: { docId },
        message: '文档上传成功，正在处理中',
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getProgress(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const progress = await this.taxkbAdapter.getProcessingProgress(id);
      reply.code(200).send({ success: true, data: progress });
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
