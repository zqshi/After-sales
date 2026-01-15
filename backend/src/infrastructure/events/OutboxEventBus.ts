import { DataSource, Repository } from 'typeorm';
import { DomainEvent } from '@domain/shared/DomainEvent';
import { OutboxEventEntity } from '../database/entities/OutboxEventEntity';

/**
 * OutboxEventBus - 基于Outbox模式的事件总线
 *
 * 核心特性:
 * 1. 事件持久化到outbox_events表
 * 2. 与聚合根保存在同一事务中
 * 3. 后台处理器异步发布事件
 * 4. 支持重试机制和死信队列
 * 5. 确保事件最终一致性
 */
export class OutboxEventBus {
  private outboxRepository: Repository<OutboxEventEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.outboxRepository = dataSource.getRepository(OutboxEventEntity);
  }

  /**
   * 发布单个事件（写入Outbox表）
   *
   * 注意: 此方法应该在聚合根保存的同一事务中调用
   */
  async publish(event: DomainEvent<object>, aggregateType: string): Promise<void> {
    const outboxEvent = new OutboxEventEntity();
    outboxEvent.id = event.eventId;
    outboxEvent.aggregateId = event.aggregateId;
    outboxEvent.aggregateType = aggregateType;
    outboxEvent.eventType = event.eventType;
    outboxEvent.eventData = event.payload;
    outboxEvent.version = event.version;
    outboxEvent.occurredAt = event.occurredAt;
    outboxEvent.status = 'pending';
    outboxEvent.retryCount = 0;
    outboxEvent.maxRetries = 3;

    await this.outboxRepository.save(outboxEvent);
  }

  /**
   * 批量发布事件（写入Outbox表）
   */
  async publishAll(
    events: DomainEvent<object>[],
    aggregateType: string,
  ): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const outboxEvents = events.map((event) => {
      const outboxEvent = new OutboxEventEntity();
      outboxEvent.id = event.eventId;
      outboxEvent.aggregateId = event.aggregateId;
      outboxEvent.aggregateType = aggregateType;
      outboxEvent.eventType = event.eventType;
      outboxEvent.eventData = event.payload;
      outboxEvent.version = event.version;
      outboxEvent.occurredAt = event.occurredAt;
      outboxEvent.status = 'pending';
      outboxEvent.retryCount = 0;
      outboxEvent.maxRetries = 3;
      return outboxEvent;
    });

    await this.outboxRepository.save(outboxEvents);
  }

  /**
   * 在事务中发布事件
   *
   * 用于确保聚合根保存和事件写入的原子性
   */
  async publishInTransaction(
    events: DomainEvent<object>[],
    aggregateType: string,
    queryRunner: any, // QueryRunner from typeorm
  ): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const outboxEvents = events.map((event) => {
      const outboxEvent = new OutboxEventEntity();
      outboxEvent.id = event.eventId;
      outboxEvent.aggregateId = event.aggregateId;
      outboxEvent.aggregateType = aggregateType;
      outboxEvent.eventType = event.eventType;
      outboxEvent.eventData = event.payload;
      outboxEvent.version = event.version;
      outboxEvent.occurredAt = event.occurredAt;
      outboxEvent.status = 'pending';
      outboxEvent.retryCount = 0;
      outboxEvent.maxRetries = 3;
      return outboxEvent;
    });

    await queryRunner.manager.save(OutboxEventEntity, outboxEvents);
  }

  /**
   * 获取待处理的事件
   *
   * @param limit 批次大小
   * @returns 待处理的事件列表
   */
  async getPendingEvents(limit: number = 100): Promise<OutboxEventEntity[]> {
    return await this.outboxRepository.find({
      where: [
        { status: 'pending' },
        {
          status: 'failed',
          nextRetryAt: new Date() as any, // 使用 LessThanOrEqual
        },
      ],
      order: {
        createdAt: 'ASC',
      },
      take: limit,
    });
  }

  /**
   * 标记事件为已发布
   */
  async markAsPublished(eventId: string): Promise<void> {
    await this.outboxRepository.update(eventId, {
      status: 'published',
      publishedAt: new Date(),
    });
  }

  /**
   * 标记事件为失败，并增加重试计数
   */
  async markAsFailed(
    eventId: string,
    errorMessage: string,
  ): Promise<void> {
    const event = await this.outboxRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      return;
    }

    const newRetryCount = event.retryCount + 1;

    // 如果重试次数超过最大值，进入死信队列
    if (newRetryCount >= event.maxRetries) {
      await this.outboxRepository.update(eventId, {
        status: 'dead_letter',
        retryCount: newRetryCount,
        errorMessage,
      });
    } else {
      // 指数退避：2^retryCount * 60秒
      const backoffSeconds = Math.pow(2, newRetryCount) * 60;
      const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);

      await this.outboxRepository.update(eventId, {
        status: 'failed',
        retryCount: newRetryCount,
        errorMessage,
        nextRetryAt,
      });
    }
  }

  /**
   * 移动到死信队列
   */
  async moveToDeadLetter(eventId: string, errorMessage: string): Promise<void> {
    await this.outboxRepository.update(eventId, {
      status: 'dead_letter',
      errorMessage,
    });
  }

  /**
   * 获取死信队列中的事件
   */
  async getDeadLetterEvents(): Promise<OutboxEventEntity[]> {
    return await this.outboxRepository.find({
      where: { status: 'dead_letter' },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  /**
   * 重试死信队列中的事件
   */
  async retryDeadLetterEvent(eventId: string): Promise<void> {
    await this.outboxRepository.update(eventId, {
      status: 'pending',
      retryCount: 0,
      errorMessage: null,
      nextRetryAt: null,
    });
  }

  /**
   * 清理已发布的旧事件（定期维护）
   *
   * @param daysToKeep 保留天数
   */
  async cleanupPublishedEvents(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.outboxRepository
      .createQueryBuilder()
      .delete()
      .from(OutboxEventEntity)
      .where('status = :status', { status: 'published' })
      .andWhere('published_at < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
