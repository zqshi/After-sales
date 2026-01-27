import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { QualityReportEntity } from '@infrastructure/database/entities/QualityReportEntity';

export class QualityReportRepository {
  private repository: Repository<QualityReportEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(QualityReportEntity);
  }

  async save(input: {
    conversationId: string;
    problemId?: string;
    qualityScore?: number;
    report: Record<string, unknown>;
  }): Promise<QualityReportEntity> {
    const entity = new QualityReportEntity();
    entity.id = uuidv4();
    entity.conversationId = input.conversationId;
    entity.problemId = input.problemId ?? null;
    entity.qualityScore = input.qualityScore ?? null;
    entity.report = input.report ?? {};
    return this.repository.save(entity);
  }

  async findLatestByConversationId(
    conversationId: string,
  ): Promise<QualityReportEntity | null> {
    return this.repository.findOne({
      where: { conversationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByConversationId(
    conversationId: string,
    pagination?: { limit: number; offset: number },
  ): Promise<QualityReportEntity[]> {
    const qb = this.repository.createQueryBuilder('report');
    qb.where('report.conversation_id = :conversationId', { conversationId });
    if (pagination) {
      qb.take(pagination.limit);
      qb.skip(pagination.offset);
    }
    return qb.orderBy('report.created_at', 'DESC').getMany();
  }

  async listLatest(pagination?: { limit: number; offset: number }): Promise<QualityReportEntity[]> {
    const qb = this.repository.createQueryBuilder('report');
    if (pagination) {
      qb.take(pagination.limit);
      qb.skip(pagination.offset);
    }
    return qb.orderBy('report.created_at', 'DESC').getMany();
  }
}
