import { MonitoringAlertEntity } from '../../../infrastructure/database/entities/MonitoringAlertEntity';
import { MonitoringAlertRepository } from '../../../infrastructure/repositories/MonitoringAlertRepository';

export class ListMonitoringAlertsUseCase {
  constructor(private readonly monitoringAlertRepository: MonitoringAlertRepository) {}

  async execute(status?: string): Promise<MonitoringAlertEntity[]> {
    return await this.monitoringAlertRepository.list(status);
  }
}
