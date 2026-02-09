import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { WorkflowRunEntity } from '@infrastructure/database/entities/WorkflowRunEntity';

export interface WorkflowRunInput {
  executionId: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  conversationId?: string | null;
  trigger?: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  durationMs?: number | null;
}

export class WorkflowRunRepository {
  private repository: Repository<WorkflowRunEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(WorkflowRunEntity);
  }

  async createOrUpdate(input: WorkflowRunInput): Promise<WorkflowRunEntity> {
    const existing = await this.repository.findOne({
      where: { executionId: input.executionId },
    });

    const entity = existing ?? new WorkflowRunEntity();
    if (!existing) {
      entity.id = uuidv4();
      entity.executionId = input.executionId;
    }
    entity.workflowName = input.workflowName;
    entity.status = input.status;
    entity.conversationId = input.conversationId ?? null;
    entity.trigger = input.trigger ?? entity.trigger ?? {};
    entity.result = input.result ?? entity.result ?? {};
    entity.errorMessage = input.errorMessage ?? null;
    entity.startedAt = input.startedAt ?? entity.startedAt ?? null;
    entity.completedAt = input.completedAt ?? null;
    entity.durationMs = input.durationMs ?? null;

    return this.repository.save(entity);
  }
}
