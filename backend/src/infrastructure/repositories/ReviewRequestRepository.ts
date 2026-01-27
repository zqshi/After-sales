import { DataSource, Repository } from 'typeorm';

import { ReviewRequest } from '@domain/review/models/ReviewRequest';
import { IReviewRequestRepository, ReviewQueryFilters } from '@domain/review/repositories/IReviewRequestRepository';
import { ReviewStatus } from '@domain/review/types';
import { DomainEventEntity } from '@infrastructure/database/entities/DomainEventEntity';
import { ReviewRequestEntity } from '@infrastructure/database/entities/ReviewRequestEntity';
import { OutboxEventBus } from '@infrastructure/events/OutboxEventBus';

import { ReviewRequestMapper } from './mappers/ReviewRequestMapper';

export class ReviewRequestRepository implements IReviewRequestRepository {
  private repository: Repository<ReviewRequestEntity>;
  private eventRepository: Repository<DomainEventEntity>;
  private outboxEventBus: OutboxEventBus;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(ReviewRequestEntity);
    this.eventRepository = dataSource.getRepository(DomainEventEntity);
    this.outboxEventBus = new OutboxEventBus(dataSource);
  }

  async findById(id: string): Promise<ReviewRequest | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ReviewRequestMapper.toDomain(entity) : null;
  }

  async findByFilters(
    filters: ReviewQueryFilters,
    pagination?: { limit: number; offset: number },
  ): Promise<ReviewRequest[]> {
    const qb = this.repository.createQueryBuilder('review');
    if (filters.conversationId) {
      qb.andWhere('"review"."conversation_id" = :conversationId', { conversationId: filters.conversationId });
    }
    if (filters.status) {
      qb.andWhere('"review"."status" = :status', { status: filters.status });
    }
    if (pagination) {
      qb.take(pagination.limit);
      qb.skip(pagination.offset);
    }
    const entities = await qb.orderBy('review.updated_at', 'DESC').getMany();
    return entities.map((entity) => ReviewRequestMapper.toDomain(entity));
  }

  async findLatestPendingByConversation(conversationId: string): Promise<ReviewRequest | null> {
    const entity = await this.repository.findOne({
      where: {
        conversationId,
        status: 'pending' as ReviewStatus,
      },
      order: { createdAt: 'DESC' },
    });
    return entity ? ReviewRequestMapper.toDomain(entity) : null;
  }

  async save(review: ReviewRequest): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const entity = ReviewRequestMapper.toEntity(review);
      await queryRunner.manager.save(entity);

      const events = review.getUncommittedEvents();
      for (const event of events) {
        const eventEntity = new DomainEventEntity();
        eventEntity.id = event.eventId;
        eventEntity.aggregateId = review.id;
        eventEntity.aggregateType = 'ReviewRequest';
        eventEntity.eventType = event.eventType;
        eventEntity.eventData = event.payload as Record<string, unknown>;
        eventEntity.occurredAt = event.occurredAt;
        eventEntity.version = event.version;
        await queryRunner.manager.save(eventEntity);
      }

      await this.outboxEventBus.publishInTransaction(events, 'ReviewRequest', queryRunner);

      review.clearEvents();
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
