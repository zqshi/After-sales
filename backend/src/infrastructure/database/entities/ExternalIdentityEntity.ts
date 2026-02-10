import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('external_identities')
export class ExternalIdentityEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 100 })
  customerId!: string;

  @Column({ type: 'varchar', length: 20 })
  channel!: string;

  @Column({ name: 'external_type', type: 'varchar', length: 10 })
  externalType!: string;

  @Column({ name: 'external_id', type: 'varchar', length: 100 })
  externalId!: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
