/**
 * QualityController - 质检HTTP控制器
 */
import { FastifyReply, FastifyRequest } from 'fastify';

import { QualityReportRepository } from '@infrastructure/repositories/QualityReportRepository';

export class QualityController {
  constructor(private readonly qualityRepository: QualityReportRepository) {}

  /**
   * GET /api/quality/:conversationId
   */
  async getLatestByConversation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { conversationId } = request.params as { conversationId: string };
      const report = await this.qualityRepository.findLatestByConversationId(conversationId);
      if (!report) {
        void reply.code(404).send({ success: false, error: { message: 'Quality report not found' } });
        return;
      }
      void reply.code(200).send({ success: true, data: report });
    } catch (error) {
      void reply.code(500).send({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Internal error' },
      });
    }
  }

  /**
   * GET /api/quality/:conversationId/reports
   */
  async listByConversation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { conversationId } = request.params as { conversationId: string };
      const query = request.query as { page?: string; limit?: string };
      const page = query.page ? Math.max(Number.parseInt(query.page, 10), 1) : 1;
      const limit = query.limit ? Math.max(Number.parseInt(query.limit, 10), 1) : 20;
      const offset = (page - 1) * limit;

      const reports = await this.qualityRepository.findByConversationId(conversationId, { limit, offset });
      void reply.code(200).send({
        success: true,
        data: {
          items: reports,
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
   * GET /api/quality/reports
   */
  async listLatest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const query = request.query as { page?: string; limit?: string };
      const page = query.page ? Math.max(Number.parseInt(query.page, 10), 1) : 1;
      const limit = query.limit ? Math.max(Number.parseInt(query.limit, 10), 1) : 20;
      const offset = (page - 1) * limit;

      const reports = await this.qualityRepository.listLatest({ limit, offset });
      void reply.code(200).send({
        success: true,
        data: {
          items: reports,
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
}
