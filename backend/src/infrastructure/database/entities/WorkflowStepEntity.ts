import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('workflow_steps')
export class WorkflowStepEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'execution_id', type: 'varchar', length: 80 })
  executionId!: string;

  @Column({ name: 'step_name', type: 'varchar', length: 120 })
  stepName!: string;

  @Column({ name: 'step_type', type: 'varchar', length: 50, nullable: true })
  stepType!: string | null;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  input!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  output!: Record<string, unknown>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
