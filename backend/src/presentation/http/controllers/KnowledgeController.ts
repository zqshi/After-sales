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
import { SyncKnowledgeItemUseCase } from '../../../application/use-cases/knowledge/SyncKnowledgeItemUseCase';
import { RetryKnowledgeUploadUseCase } from '../../../application/use-cases/knowledge/RetryKnowledgeUploadUseCase';
import { TaxKBAdapter, TaxKBError } from '../../../infrastructure/adapters/TaxKBAdapter';
import { randomUUID } from 'crypto';

export class KnowledgeController {
  constructor(
    private readonly createUseCase: CreateKnowledgeItemUseCase,
    private readonly getUseCase: GetKnowledgeItemUseCase,
    private readonly listUseCase: ListKnowledgeItemsUseCase,
    private readonly updateUseCase: UpdateKnowledgeItemUseCase,
    private readonly deleteUseCase: DeleteKnowledgeItemUseCase,
    private readonly searchKnowledgeUseCase: SearchKnowledgeUseCase,
    private readonly uploadDocumentUseCase: UploadDocumentUseCase,
    private readonly syncKnowledgeItemUseCase: SyncKnowledgeItemUseCase,
    private readonly retryKnowledgeUploadUseCase: RetryKnowledgeUploadUseCase,
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
      const user = request.user as { name?: string; email?: string; sub?: string } | undefined;
      const owner =
        user?.name ||
        user?.email ||
        user?.sub ||
        undefined;
      if (owner) {
        payload.metadata = {
          ...(payload.metadata ?? {}),
          owner: (payload.metadata as Record<string, unknown> | undefined)?.owner || owner,
        };
      }
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
      const query = request.query as { deleteRelatedFaq?: string };
      const deleteRelatedFaq = query?.deleteRelatedFaq === 'true';
      await this.deleteUseCase.execute({ knowledgeId: id, deleteRelatedFaq });
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
      const file = await this.getUploadedFile(request);
      if (!file) {
        throw new Error('No file uploaded');
      }

      const buffer = await file.toBuffer();
      const body = request.body as Record<string, unknown>;
      const category = typeof body?.category === 'string' ? body.category : undefined;
      const companyEntity =
        typeof body?.companyEntity === 'string' ? body.companyEntity : undefined;

      if (!this.taxkbAdapter.isEnabled()) {
        const docId = randomUUID();
        reply.code(202).send({
          success: true,
          data: { docId },
          message: 'TaxKB 未启用，文档已接受，后续解析需手动处理',
        });
        return;
      }

      const docId = await this.uploadDocumentUseCase.execute({
        file: buffer,
        title: file.filename,
        fileName: file.filename,
        category,
        companyEntity,
      });

      reply.code(201).send({
        success: true,
        data: { docId },
        message: '文档上传成功，正在处理中',
      });
    } catch (error) {
      if (error instanceof TaxKBError) {
        const detail = (error.details as Record<string, unknown> | undefined)?.detail as
          | Record<string, unknown>
          | undefined;
        const existingDoc = detail?.existing_doc as Record<string, unknown> | undefined;
        const existingDocId = typeof existingDoc?.doc_id === 'string' ? existingDoc.doc_id : '';
        const existingStatus = typeof existingDoc?.status === 'string' ? existingDoc.status : '';
        if (error.statusCode === 409 && existingDocId) {
          reply.code(200).send({
            success: true,
            data: { docId: existingDocId, status: existingStatus },
            message: '文档已存在，已关联解析',
          });
          return;
        }

        request.log.error(
          { err: error, statusCode: error.statusCode, details: error.details },
          '[knowledge] TaxKB upload failed',
        );
      } else {
        request.log.error({ err: error }, '[knowledge] Upload failed');
      }
      this.handleError(error, reply);
    }
  }

  private async getUploadedFile(request: FastifyRequest): Promise<{
    filename: string;
    toBuffer: () => Promise<Buffer>;
  } | null> {
    try {
      const file = await request.file();
      if (file) {
        return file;
      }
    } catch {
      // ignore and try fallbacks
    }

    const body = request.body as Record<string, unknown> | undefined;
    const bodyFile = body?.file as { filename?: string; toBuffer?: () => Promise<Buffer> } | undefined;
    if (bodyFile?.toBuffer) {
      return {
        filename: bodyFile.filename || 'upload',
        toBuffer: bodyFile.toBuffer.bind(bodyFile),
      };
    }

    const bodyFiles = body?.files as Array<{ filename?: string; toBuffer?: () => Promise<Buffer> }> | undefined;
    if (Array.isArray(bodyFiles) && bodyFiles.length && bodyFiles[0]?.toBuffer) {
      const first = bodyFiles[0];
      return {
        filename: first.filename || 'upload',
        toBuffer: first.toBuffer.bind(first),
      };
    }

    if (typeof request.files === 'function') {
      try {
        for await (const part of request.files()) {
          if (part?.toBuffer) {
            return {
              filename: part.filename || 'upload',
              toBuffer: part.toBuffer.bind(part),
            };
          }
        }
      } catch {
        // ignore iterator errors
      }
    }

    return null;
  }

  async getProgress(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      if (!this.taxkbAdapter.isEnabled()) {
        reply.code(200).send({
          success: true,
          data: {
            overall_status: 'disabled',
            overall_progress: 0,
            tasks: [],
          },
        });
        return;
      }
      const { id } = request.params as { id: string };
      const progress = await this.taxkbAdapter.getProcessingProgress(id);
      reply.code(200).send({ success: true, data: progress });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async sync(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const payload = request.body as { uploadDocId?: string } | undefined;
      const result = await this.syncKnowledgeItemUseCase.execute({
        knowledgeId: id,
        uploadDocId: payload?.uploadDocId,
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async retry(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const result = await this.retryKnowledgeUploadUseCase.execute({
        knowledgeId: id,
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply): void {
    if (error instanceof Error) {
      const status =
        typeof (error as { statusCode?: number }).statusCode === 'number'
          ? (error as { statusCode: number }).statusCode
          : this.getStatus(error.message);
      const message =
        typeof (error as { details?: { message?: string } }).details?.message === 'string'
          ? (error as { details: { message: string } }).details.message
          : error.message;
      console.error('[KnowledgeController] request failed:', error);
      reply.code(status).send({
        success: false,
        error: { message, code: this.getCode(message) },
      });
      return;
    }
    reply.code(500).send({
      success: false,
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
    });
  }

  private getStatus(message: string): number {
    if (message.includes('No file uploaded') || message.includes('file buffer is required')) {
      return 400;
    }
    if (message.includes('not found')) {
      return 404;
    }
    if (message.includes('required') || message.includes('invalid')) {
      return 400;
    }
    return 500;
  }

  private getCode(message: string): string {
    if (message.includes('No file uploaded') || message.includes('file buffer is required')) {
      return 'VALIDATION_ERROR';
    }
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
