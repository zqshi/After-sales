import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Outbox事件实体
 * 实现Outbox模式，确保事件最终一致性
 */
@Entity('outbox_events')
@Index(['status', 'createdAt'])
@Index(['aggregateId'])
@Index(['eventType'])
export class OutboxEventEntity {
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

  @Column({ type: 'int' })
  version!: number;

  /**
   * 事件状态
   * - pending: 待处理
   * - published: 已发布
   * - failed: 处理失败
   * - dead_letter: 进入死信队列
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: 'pending' | 'published' | 'failed' | 'dead_letter';

  /**
   * 重试次数
   */
  @Column({
    name: 'retry_count',
    type: 'int',
    default: 0,
  })
  retryCount!: number;

  /**
   * 最大重试次数
   */
  @Column({
    name: 'max_retries',
    type: 'int',
    default: 3,
  })
  maxRetries!: number;

  /**
   * 错误信息
   */
  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
  })
  errorMessage?: string;

  /**
   * 下次重试时间（指数退避）
   */
  @Column({
    name: 'next_retry_at',
    type: 'timestamp',
    nullable: true,
  })
  nextRetryAt?: Date;

  /**
   * 发布时间
   */
  @Column({
    name: 'published_at',
    type: 'timestamp',
    nullable: true,
  })
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  /**
   * 事件发生时间（业务时间）
   */
  @Column({ name: 'occurred_at', type: 'timestamp' })
  occurredAt!: Date;
}
