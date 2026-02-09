import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { WorkflowStepEntity } from '@infrastructure/database/entities/WorkflowStepEntity';

export interface WorkflowStepInput {
  executionId: string;
  stepName: string;
  stepType?: string | null;
  status: 'success' | 'error' | 'timeout' | 'skipped';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorMessage?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  durationMs?: number | null;
}

export class WorkflowStepRepository {
  private repository: Repository<WorkflowStepEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(WorkflowStepEntity);
  }

  async save(input: WorkflowStepInput): Promise<WorkflowStepEntity> {
    const entity = new WorkflowStepEntity();
    entity.id = uuidv4();
    entity.executionId = input.executionId;
    entity.stepName = input.stepName;
    entity.stepType = input.stepType ?? null;
    entity.status = input.status;
    entity.input = input.input ?? {};
    entity.output = input.output ?? {};
    entity.errorMessage = input.errorMessage ?? null;
    entity.startedAt = input.startedAt ?? null;
    entity.completedAt = input.completedAt ?? null;
    entity.durationMs = input.durationMs ?? null;
    return this.repository.save(entity);
  }
}
