import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

import { ConversationEntity } from './ConversationEntity';

@Entity('requirements')
export class RequirementEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 50 })
  customerId!: string;

  @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
  conversationId!: string | null;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50 })
  category!: string;

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  priority!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source!: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 50, nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @ManyToOne(() => ConversationEntity)
  @JoinColumn({ name: 'conversation_id' })
  conversation!: ConversationEntity | null;
}
