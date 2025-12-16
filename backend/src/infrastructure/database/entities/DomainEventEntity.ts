import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('domain_events')
@Index(['aggregateId', 'version'])
@Index(['eventType'])
export class DomainEventEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId!: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 50 })
  aggregateType!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType!: string;

  @Column({ name: 'event_data', type: 'jsonb' })
  eventData!: Record<string, unknown>;

  @CreateDateColumn({ name: 'occurred_at', type: 'timestamp' })
  occurredAt!: Date;

  @Column({ type: 'int' })
  version!: number;
}
