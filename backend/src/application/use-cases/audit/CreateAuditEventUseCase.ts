import { randomUUID } from 'crypto';

import { AuditEventEntity } from '../../../infrastructure/database/entities/AuditEventEntity';
import { AuditEventRepository } from '../../../infrastructure/repositories/AuditEventRepository';
import { CreateAuditEventRequestDTO } from '../../dto/audit/CreateAuditEventRequestDTO';

export interface CreateAuditEventContext {
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export class CreateAuditEventUseCase {
  constructor(private readonly auditEventRepository: AuditEventRepository) {}

  async execute(
    payload: CreateAuditEventRequestDTO,
    context: CreateAuditEventContext,
  ): Promise<void> {
    if (!payload.action || !payload.resource) {
      throw new Error('action and resource are required');
    }

    const entity = new AuditEventEntity();
    entity.id = randomUUID();
    entity.userId = context.userId ?? null;
    entity.action = payload.action;
    entity.resource = payload.resource;
    entity.metadata = payload.metadata ?? {};
    entity.ip = context.ip ?? null;
    entity.userAgent = context.userAgent ?? null;

    await this.auditEventRepository.create(entity);
  }
}
