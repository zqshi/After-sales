import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('review_requests')
export class ReviewRequestEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  suggestion!: Record<string, unknown>;

  @Column({ type: 'float', nullable: true })
  confidence?: number | null;

  @Column({ name: 'reviewer_id', type: 'varchar', length: 64, nullable: true })
  reviewerId?: string | null;

  @Column({ name: 'reviewer_note', type: 'text', nullable: true })
  reviewerNote?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date | null;
}
