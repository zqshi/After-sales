import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

import { MessageEntity } from './MessageEntity';

@Entity('conversations')
export class ConversationEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 50 })
  customerId!: string;

  @Column({ name: 'agent_id', type: 'varchar', length: 50, nullable: true })
  agentId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  channel!: string;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status!: string;

  @Column({ type: 'varchar', length: 20, default: 'normal' })
  priority!: string;

  @Column({ name: 'sla_status', type: 'varchar', length: 20, default: 'normal' })
  slaStatus!: string;

  @Column({ name: 'sla_deadline', type: 'timestamp', nullable: true })
  slaDeadline!: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'agent_auto', nullable: true })
  mode!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt!: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @OneToMany(() => MessageEntity, (message) => message.conversation, {
    cascade: true,
  })
  messages!: MessageEntity[];
}
