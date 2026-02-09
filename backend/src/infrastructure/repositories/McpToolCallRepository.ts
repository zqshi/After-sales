import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { McpToolCallEntity } from '@infrastructure/database/entities/McpToolCallEntity';

export interface McpToolCallInput {
  toolName: string;
  conversationId?: string | null;
  customerId?: string | null;
  agentName?: string | null;
  status: 'success' | 'error';
  durationMs?: number | null;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string | null;
}

export class McpToolCallRepository {
  private repository: Repository<McpToolCallEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(McpToolCallEntity);
  }

  async save(input: McpToolCallInput): Promise<McpToolCallEntity> {
    const entity = new McpToolCallEntity();
    entity.id = uuidv4();
    entity.toolName = input.toolName;
    entity.conversationId = input.conversationId ?? null;
    entity.customerId = input.customerId ?? null;
    entity.agentName = input.agentName ?? null;
    entity.status = input.status;
    entity.durationMs = input.durationMs ?? null;
    entity.args = input.args ?? {};
    entity.result = input.result ?? {};
    entity.errorMessage = input.errorMessage ?? null;
    return this.repository.save(entity);
  }
}
