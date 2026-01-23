import { MonitoringAlertRepository } from '../../../infrastructure/repositories/MonitoringAlertRepository';
import { MonitoringAlertEntity } from '../../../infrastructure/database/entities/MonitoringAlertEntity';

export class ListMonitoringAlertsUseCase {
  constructor(private readonly monitoringAlertRepository: MonitoringAlertRepository) {}

  async execute(status?: string): Promise<MonitoringAlertEntity[]> {
    return await this.monitoringAlertRepository.list(status);
  }
}
