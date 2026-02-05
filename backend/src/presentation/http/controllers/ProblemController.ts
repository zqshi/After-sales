/**
 * ProblemController - 问题HTTP控制器
 */
import { FastifyReply, FastifyRequest } from 'fastify';

import { CreateProblemUseCase } from '@application/use-cases/problem/CreateProblemUseCase';
import { UpdateProblemStatusUseCase } from '@application/use-cases/problem/UpdateProblemStatusUseCase';
import { ProblemRepository } from '@infrastructure/repositories/ProblemRepository';

export class ProblemController {
  constructor(
    private readonly problemRepository: ProblemRepository,
    private readonly createProblemUseCase: CreateProblemUseCase,
    private readonly updateProblemStatusUseCase: UpdateProblemStatusUseCase,
  ) {}

  /**
   * POST /api/problems
   */
  async createProblem(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const payload = request.body as {
        customerId: string;
        conversationId: string;
        title: string;
        description?: string;
        intent?: string;
        confidence?: number;
        metadata?: Record<string, unknown>;
      };

      const problem = await this.createProblemUseCase.execute({
        customerId: payload.customerId,
        conversationId: payload.conversationId,
        title: payload.title,
        description: payload.description,
        intent: payload.intent,
        confidence: payload.confidence,
        metadata: payload.metadata,
      });

      void reply.code(201).send({ success: true, data: this.toDto(problem) });
    } catch (error) {
      void reply.code(500).send({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Internal error' },
      });
    }
  }

  /**
   * GET /api/problems/:id
   */
  async getProblem(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const problem = await this.problemRepository.findById(id);
      if (!problem) {
        void reply.code(404).send({ success: false, error: { message: 'Problem not found' } });
        return;
      }
      void reply.code(200).send({ success: true, data: this.toDto(problem) });
    } catch (error) {
      void reply.code(500).send({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Internal error' },
      });
    }
  }

  /**
   * GET /api/problems
   */
  async listProblems(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const query = request.query as {
        conversationId?: string;
        customerId?: string;
        status?: string;
        page?: string;
        limit?: string;
      };
      const page = query.page ? Math.max(Number.parseInt(query.page, 10), 1) : 1;
      const limit = query.limit ? Math.max(Number.parseInt(query.limit, 10), 1) : 20;
      const offset = (page - 1) * limit;

      const [items, total] = await Promise.all([
        this.problemRepository.findByFilters(
          {
            conversationId: query.conversationId,
            customerId: query.customerId,
            status: query.status as any,
          },
          { limit, offset },
        ),
        this.problemRepository.countByFilters({
          conversationId: query.conversationId,
          customerId: query.customerId,
          status: query.status as any,
        }),
      ]);

      void reply.code(200).send({
        success: true,
        data: {
          items: items.map((problem) => this.toDto(problem)),
          total,
          page,
          limit,
        },
      });
    } catch (error) {
      void reply.code(500).send({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Internal error' },
      });
    }
  }

  /**
   * PATCH /api/problems/:id/status
   */
  async updateStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const { status, reason } = request.body as { status: string; reason?: string };

      const problem = await this.updateProblemStatusUseCase.execute({
        problemId: id,
        status: status as any,
        reason,
      });

      void reply.code(200).send({ success: true, data: this.toDto(problem) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      void reply.code(message.includes('not found') ? 404 : 500).send({
        success: false,
        error: { message },
      });
    }
  }

  private toDto(problem: any) {
    return {
      id: problem.id,
      customerId: problem.customerId,
      conversationId: problem.conversationId,
      title: problem.title,
      description: problem.description,
      status: problem.status,
      intent: problem.intent,
      confidence: problem.confidence,
      metadata: problem.metadata,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
      resolvedAt: problem.resolvedAt,
    };
  }
}
