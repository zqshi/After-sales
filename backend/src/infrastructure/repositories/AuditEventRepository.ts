import { DataSource, Repository, MoreThanOrEqual } from 'typeorm';

import { AuditEventEntity } from '@infrastructure/database/entities/AuditEventEntity';

export class AuditEventRepository {
  private repository: Repository<AuditEventEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(AuditEventEntity);
  }

  async create(event: AuditEventEntity): Promise<AuditEventEntity> {
    return await this.repository.save(event);
  }

  async getSummary(since: Date): Promise<{
    total: number;
    byAction: Record<string, number>;
    byResource: Record<string, number>;
  }> {
    const total = await this.repository.count({ where: { createdAt: MoreThanOrEqual(since) } });

    const byActionRows = await this.repository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('audit.created_at >= :since', { since })
      .groupBy('audit.action')
      .getRawMany();

    const byResourceRows = await this.repository
      .createQueryBuilder('audit')
      .select('audit.resource', 'resource')
      .addSelect('COUNT(*)', 'count')
      .where('audit.created_at >= :since', { since })
      .groupBy('audit.resource')
      .getRawMany();

    const byAction = byActionRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.action] = Number(row.count || 0);
      return acc;
    }, {});

    const byResource = byResourceRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.resource] = Number(row.count || 0);
      return acc;
    }, {});

    return { total, byAction, byResource };
  }
}
