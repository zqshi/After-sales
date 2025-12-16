import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('customer_profiles')
export class CustomerProfileEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 50, unique: true })
  customerId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  company!: string | null;

  @Column({ type: 'text', array: true, default: [] })
  tags!: string[];

  @Column({ name: 'health_score', type: 'int', default: 0 })
  healthScore!: number;

  @Column({ name: 'contact_info', type: 'jsonb', default: {} })
  contactInfo!: Record<string, unknown>;

  @Column({ name: 'sla_info', type: 'jsonb', default: {} })
  slaInfo!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  metrics!: Record<string, unknown>;

  @Column({ type: 'jsonb', array: false, default: [] })
  insights!: Record<string, unknown>[];

  @Column({ type: 'jsonb', array: false, default: [] })
  interactions!: Record<string, unknown>[];

  @Column({ name: 'service_records', type: 'jsonb', array: false, default: [] })
  serviceRecords!: Record<string, unknown>[];

  @Column({ type: 'jsonb', array: false, default: [] })
  commitments!: Record<string, unknown>[];

  @Column({ name: 'is_vip', type: 'boolean', default: false })
  isVIP!: boolean;

  @Column({ name: 'risk_level', type: 'varchar', length: 10, default: 'low' })
  riskLevel!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
