import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('workflow_runs')
export class WorkflowRunEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'execution_id', type: 'varchar', length: 80 })
  executionId!: string;

  @Column({ name: 'workflow_name', type: 'varchar', length: 120 })
  workflowName!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
  conversationId!: string | null;

  @Column({ type: 'jsonb', default: {} })
  trigger!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  result!: Record<string, unknown>;

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

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
