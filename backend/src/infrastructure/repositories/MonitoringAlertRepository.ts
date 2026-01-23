import { DataSource, Repository } from 'typeorm';

import { MonitoringAlertEntity } from '@infrastructure/database/entities/MonitoringAlertEntity';

export class MonitoringAlertRepository {
  private repository: Repository<MonitoringAlertEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(MonitoringAlertEntity);
  }

  async create(alert: MonitoringAlertEntity): Promise<MonitoringAlertEntity> {
    return await this.repository.save(alert);
  }

  async list(status?: string): Promise<MonitoringAlertEntity[]> {
    const qb = this.repository.createQueryBuilder('alert');
    if (status) {
      qb.where('alert.status = :status', { status });
    }
    qb.orderBy('alert.created_at', 'DESC');
    return await qb.getMany();
  }

  async resolve(id: string): Promise<MonitoringAlertEntity | null> {
    const alert = await this.repository.findOne({ where: { id } });
    if (!alert) {
      return null;
    }
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    return await this.repository.save(alert);
  }
}
