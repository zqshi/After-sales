import { AuditEventRepository } from '../../../infrastructure/repositories/AuditEventRepository';

export interface AuditSummaryResponse {
  since: string;
  total: number;
  byAction: Record<string, number>;
  byResource: Record<string, number>;
}

export class GetAuditSummaryUseCase {
  constructor(private readonly auditEventRepository: AuditEventRepository) {}

  async execute(days: number): Promise<AuditSummaryResponse> {
    const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 7;
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

    const summary = await this.auditEventRepository.getSummary(since);

    return {
      since: since.toISOString(),
      total: summary.total,
      byAction: summary.byAction,
      byResource: summary.byResource,
    };
  }
}
