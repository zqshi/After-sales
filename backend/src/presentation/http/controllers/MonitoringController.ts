import { FastifyReply, FastifyRequest } from 'fastify';

import { CreateMonitoringAlertUseCase } from '../../../application/use-cases/monitoring/CreateMonitoringAlertUseCase';
import { ListMonitoringAlertsUseCase } from '../../../application/use-cases/monitoring/ListMonitoringAlertsUseCase';
import { ResolveMonitoringAlertUseCase } from '../../../application/use-cases/monitoring/ResolveMonitoringAlertUseCase';
import { CreateMonitoringAlertRequestDTO } from '../../../application/dto/monitoring/CreateMonitoringAlertRequestDTO';

export class MonitoringController {
  constructor(
    private readonly createMonitoringAlertUseCase: CreateMonitoringAlertUseCase,
    private readonly listMonitoringAlertsUseCase: ListMonitoringAlertsUseCase,
    private readonly resolveMonitoringAlertUseCase: ResolveMonitoringAlertUseCase,
  ) {}

  async listAlerts(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { status } = request.query as { status?: string };
      const alerts = await this.listMonitoringAlertsUseCase.execute(status);
      reply.code(200).send({ success: true, data: alerts });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ success: false, error: message });
    }
  }

  async createAlert(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const payload = request.body as CreateMonitoringAlertRequestDTO;
      const alert = await this.createMonitoringAlertUseCase.execute(payload);
      reply.code(201).send({ success: true, data: alert });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ success: false, error: message });
    }
  }

  async resolveAlert(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const alert = await this.resolveMonitoringAlertUseCase.execute(id);
      reply.code(200).send({ success: true, data: alert });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(404).send({ success: false, error: message });
    }
  }
}
