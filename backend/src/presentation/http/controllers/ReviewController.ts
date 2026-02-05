/**
 * ReviewController - 审核HTTP控制器
 */
import { FastifyReply, FastifyRequest } from 'fastify';

import { CreateReviewRequestUseCase } from '@application/use-cases/review/CreateReviewRequestUseCase';
import { CompleteReviewRequestUseCase } from '@application/use-cases/review/CompleteReviewRequestUseCase';
import { ReviewRequestRepository } from '@infrastructure/repositories/ReviewRequestRepository';

export class ReviewController {
  constructor(
    private readonly reviewRepository: ReviewRequestRepository,
    private readonly createReviewUseCase: CreateReviewRequestUseCase,
    private readonly completeReviewUseCase: CompleteReviewRequestUseCase,
  ) {}

  /**
   * POST /api/reviews
   */
  async createReview(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const payload = request.body as {
        conversationId: string;
        suggestion: Record<string, unknown>;
        confidence?: number;
      };

      const review = await this.createReviewUseCase.execute({
        conversationId: payload.conversationId,
        suggestion: payload.suggestion,
        confidence: payload.confidence,
      });

      void reply.code(201).send({ success: true, data: this.toDto(review) });
    } catch (error) {
      void reply.code(500).send({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Internal error' },
      });
    }
  }

  /**
   * GET /api/reviews/:id
   */
  async getReview(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const review = await this.reviewRepository.findById(id);
      if (!review) {
        void reply.code(404).send({ success: false, error: { message: 'Review not found' } });
        return;
      }
      void reply.code(200).send({ success: true, data: this.toDto(review) });
    } catch (error) {
      void reply.code(500).send({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Internal error' },
      });
    }
  }

  /**
   * GET /api/reviews
   */
  async listReviews(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const query = request.query as {
        conversationId?: string;
        status?: string;
        page?: string;
        limit?: string;
      };
      const page = query.page ? Math.max(Number.parseInt(query.page, 10), 1) : 1;
      const limit = query.limit ? Math.max(Number.parseInt(query.limit, 10), 1) : 20;
      const offset = (page - 1) * limit;

      const items = await this.reviewRepository.findByFilters(
        {
          conversationId: query.conversationId,
          status: query.status as any,
        },
        { limit, offset },
      );

      void reply.code(200).send({
        success: true,
        data: {
          items: items.map((review) => this.toDto(review)),
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
   * POST /api/reviews/:id/complete
   */
  async completeReview(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const payload = request.body as {
        status: 'approved' | 'rejected';
        reviewerId?: string;
        reviewerNote?: string;
      };

      const review = await this.completeReviewUseCase.execute({
        reviewId: id,
        status: payload.status as any,
        reviewerId: payload.reviewerId,
        reviewerNote: payload.reviewerNote,
      });

      void reply.code(200).send({ success: true, data: this.toDto(review) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      void reply.code(message.includes('not found') ? 404 : 500).send({
        success: false,
        error: { message },
      });
    }
  }

  private toDto(review: any) {
    return {
      id: review.id,
      conversationId: review.conversationId,
      status: review.status,
      suggestion: review.suggestion,
      confidence: review.confidence,
      reviewerId: review.reviewerId,
      reviewerNote: review.reviewerNote,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      resolvedAt: review.resolvedAt,
    };
  }
}
