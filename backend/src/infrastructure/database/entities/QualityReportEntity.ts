import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('quality_reports')
export class QualityReportEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @Column({ name: 'problem_id', type: 'uuid', nullable: true })
  problemId?: string | null;

  @Column({ name: 'quality_score', type: 'int', nullable: true })
  qualityScore?: number | null;

  @Column({ type: 'jsonb', default: {} })
  report!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
