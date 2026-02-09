import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { AgentCallEntity } from '@infrastructure/database/entities/AgentCallEntity';

export interface AgentCallInput {
  conversationId?: string | null;
  agentName: string;
  agentRole?: string | null;
  mode?: string | null;
  status: 'success' | 'error' | 'timeout' | 'skipped';
  durationMs?: number | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export class AgentCallRepository {
  private repository: Repository<AgentCallEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(AgentCallEntity);
  }

  async save(input: AgentCallInput): Promise<AgentCallEntity> {
    const entity = new AgentCallEntity();
    entity.id = uuidv4();
    entity.conversationId = input.conversationId ?? null;
    entity.agentName = input.agentName;
    entity.agentRole = input.agentRole ?? null;
    entity.mode = input.mode ?? null;
    entity.status = input.status;
    entity.durationMs = input.durationMs ?? null;
    entity.startedAt = input.startedAt ?? null;
    entity.completedAt = input.completedAt ?? null;
    entity.input = input.input ?? {};
    entity.output = input.output ?? {};
    entity.errorMessage = input.errorMessage ?? null;
    entity.metadata = input.metadata ?? {};
    return this.repository.save(entity);
  }
}
