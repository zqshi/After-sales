import { DataSource, Repository } from 'typeorm';

import { Problem } from '@domain/problem/models/Problem';
import { IProblemRepository, ProblemQueryFilters } from '@domain/problem/repositories/IProblemRepository';
import { ProblemStatus } from '@domain/problem/types';
import { DomainEventEntity } from '@infrastructure/database/entities/DomainEventEntity';
import { ProblemEntity } from '@infrastructure/database/entities/ProblemEntity';
import { OutboxEventBus } from '@infrastructure/events/OutboxEventBus';

import { ProblemMapper } from './mappers/ProblemMapper';

export class ProblemRepository implements IProblemRepository {
  private repository: Repository<ProblemEntity>;
  private eventRepository: Repository<DomainEventEntity>;
  private outboxEventBus: OutboxEventBus;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(ProblemEntity);
    this.eventRepository = dataSource.getRepository(DomainEventEntity);
    this.outboxEventBus = new OutboxEventBus(dataSource);
  }

  async findById(id: string): Promise<Problem | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ProblemMapper.toDomain(entity) : null;
  }

  async findByFilters(
    filters: ProblemQueryFilters,
    pagination?: { limit: number; offset: number },
  ): Promise<Problem[]> {
    const qb = this.repository.createQueryBuilder('problem');
    if (filters.conversationId) {
      qb.andWhere('"problem"."conversation_id" = :conversationId', { conversationId: filters.conversationId });
    }
    if (filters.customerId) {
      qb.andWhere('"problem"."customer_id" = :customerId', { customerId: filters.customerId });
    }
    if (filters.status) {
      qb.andWhere('"problem"."status" = :status', { status: filters.status });
    }
    if (pagination) {
      qb.take(pagination.limit);
      qb.skip(pagination.offset);
    }
    const entities = await qb.orderBy('problem.updated_at', 'DESC').getMany();
    return entities.map((entity) => ProblemMapper.toDomain(entity));
  }

  async countByFilters(filters: ProblemQueryFilters): Promise<number> {
    const qb = this.repository.createQueryBuilder('problem');
    if (filters.conversationId) {
      qb.andWhere('"problem"."conversation_id" = :conversationId', { conversationId: filters.conversationId });
    }
    if (filters.customerId) {
      qb.andWhere('"problem"."customer_id" = :customerId', { customerId: filters.customerId });
    }
    if (filters.status) {
      qb.andWhere('"problem"."status" = :status', { status: filters.status });
    }
    return qb.getCount();
  }

  async findActiveByConversationId(conversationId: string): Promise<Problem | null> {
    const qb = this.repository.createQueryBuilder('problem');
    qb.where('"problem"."conversation_id" = :conversationId', { conversationId })
      .andWhere('"problem"."status" != :resolved', { resolved: 'resolved' as ProblemStatus })
      .orderBy('problem.updated_at', 'DESC')
      .limit(1);
    const entity = await qb.getOne();
    return entity ? ProblemMapper.toDomain(entity) : null;
  }

  async findLatestResolvedByConversationId(conversationId: string): Promise<Problem | null> {
    const entity = await this.repository.findOne({
      where: {
        conversationId,
        status: 'resolved' as ProblemStatus,
      },
      order: { resolvedAt: 'DESC' },
    });

    return entity ? ProblemMapper.toDomain(entity) : null;
  }

  async save(problem: Problem): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const entity = ProblemMapper.toEntity(problem);
      await queryRunner.manager.save(entity);

      const events = problem.getUncommittedEvents();
      for (const event of events) {
        const eventEntity = new DomainEventEntity();
        eventEntity.id = event.eventId;
        eventEntity.aggregateId = problem.id;
        eventEntity.aggregateType = 'Problem';
        eventEntity.eventType = event.eventType;
        eventEntity.eventData = event.payload as Record<string, unknown>;
        eventEntity.occurredAt = event.occurredAt;
        eventEntity.version = event.version;
        await queryRunner.manager.save(eventEntity);
      }

      await this.outboxEventBus.publishInTransaction(events, 'Problem', queryRunner);

      problem.clearEvents();
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
