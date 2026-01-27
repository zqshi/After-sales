import { MonitoringAlertEntity } from '../../../infrastructure/database/entities/MonitoringAlertEntity';
import { MonitoringAlertRepository } from '../../../infrastructure/repositories/MonitoringAlertRepository';

export class ResolveMonitoringAlertUseCase {
  constructor(private readonly monitoringAlertRepository: MonitoringAlertRepository) {}

  async execute(id: string): Promise<MonitoringAlertEntity> {
    if (!id) {
      throw new Error('id is required');
    }
    const resolved = await this.monitoringAlertRepository.resolve(id);
    if (!resolved) {
      throw new Error('alert not found');
    }
    return resolved;
  }
}
