import { FastifyReply, FastifyRequest } from 'fastify';

import { CreateAuditEventUseCase } from '../../../application/use-cases/audit/CreateAuditEventUseCase';
import { GetReportSummaryUseCase } from '../../../application/use-cases/report/GetReportSummaryUseCase';
import { CreateAuditEventRequestDTO } from '../../../application/dto/audit/CreateAuditEventRequestDTO';

export class AuditController {
  constructor(
    private readonly createAuditEventUseCase: CreateAuditEventUseCase,
    private readonly getReportSummaryUseCase: GetReportSummaryUseCase,
  ) {}

  async createEvent(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const payload = request.body as CreateAuditEventRequestDTO;
      const user = request.user as { sub?: string } | undefined;
      const ip = request.ip;
      const userAgent = request.headers['user-agent'] ?? null;

      await this.createAuditEventUseCase.execute(payload, {
        userId: user?.sub ?? null,
        ip,
        userAgent: typeof userAgent === 'string' ? userAgent : null,
      });

      reply.code(201).send({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ success: false, error: message });
    }
  }

  async getSummary(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { days } = request.query as { days?: string };
      const parsedDays = days ? Number.parseInt(days, 10) : 7;
      const summary = await this.getReportSummaryUseCase.execute(parsedDays);
      reply.code(200).send({ success: true, data: { report: summary } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ success: false, error: message });
    }
  }
}
