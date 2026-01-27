import { randomUUID } from 'crypto';

import { MonitoringAlertEntity } from '../../../infrastructure/database/entities/MonitoringAlertEntity';
import { MonitoringAlertRepository } from '../../../infrastructure/repositories/MonitoringAlertRepository';
import { CreateMonitoringAlertRequestDTO } from '../../dto/monitoring/CreateMonitoringAlertRequestDTO';

export class CreateMonitoringAlertUseCase {
  constructor(private readonly monitoringAlertRepository: MonitoringAlertRepository) {}

  async execute(payload: CreateMonitoringAlertRequestDTO): Promise<MonitoringAlertEntity> {
    if (!payload.level || !payload.title) {
      throw new Error('level and title are required');
    }

    const alert = new MonitoringAlertEntity();
    alert.id = randomUUID();
    alert.level = payload.level;
    alert.title = payload.title;
    alert.message = payload.message ?? null;
    alert.status = 'open';
    alert.source = payload.source ?? null;
    alert.metadata = payload.metadata ?? {};
    alert.resolvedAt = null;

    return await this.monitoringAlertRepository.create(alert);
  }
}
