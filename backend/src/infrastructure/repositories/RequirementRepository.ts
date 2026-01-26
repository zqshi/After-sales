import { DataSource, Repository } from 'typeorm';

import { IRequirementRepository, RequirementQueryFilters, RequirementPagination } from '@domain/requirement/repositories/IRequirementRepository';
import { Requirement } from '@domain/requirement/models/Requirement';
import { RequirementEntity } from '@infrastructure/database/entities/RequirementEntity';
import { DomainEventEntity } from '@infrastructure/database/entities/DomainEventEntity';
import { OutboxEventBus } from '@infrastructure/events/OutboxEventBus';
import { RequirementMapper } from './mappers/RequirementMapper';
import type { ISpecification } from '@domain/shared/Specification';

export class RequirementRepository implements IRequirementRepository {
  private repository: Repository<RequirementEntity>;
  private dataSource: DataSource;
  private outboxEventBus: OutboxEventBus;

  constructor(dataSource: DataSource, outboxEventBus: OutboxEventBus) {
    this.repository = dataSource.getRepository(RequirementEntity);
    this.dataSource = dataSource;
    this.outboxEventBus = outboxEventBus;
  }

  async findById(id: string): Promise<Requirement | null> {
    const entity = await this.repository.findOne({
      where: { id },
    });

    if (!entity) {
      return null;
    }

    return RequirementMapper.toDomain(entity);
  }

  async findByFilters(
    filters: RequirementQueryFilters,
    pagination?: { limit: number; offset: number },
  ): Promise<Requirement[]> {
    const qb = this.repository.createQueryBuilder('requirement');
    if (filters.customerId) {
      qb.andWhere('"requirement"."customer_id" = :customerId', { customerId: filters.customerId });
    }
    if (filters.conversationId) {
      qb.andWhere('"requirement"."conversation_id" = :conversationId', { conversationId: filters.conversationId });
    }
    if (filters.status) {
      qb.andWhere('"requirement"."status" = :status', { status: filters.status });
    }
    if (filters.category) {
      qb.andWhere('"requirement"."category" = :category', { category: filters.category });
    }
    if (filters.priority) {
      qb.andWhere('"requirement"."priority" = :priority', { priority: filters.priority });
    }

    if (pagination) {
      qb.take(pagination.limit);
      qb.skip(pagination.offset);
    }
    const entities = await qb.orderBy('requirement.updated_at', 'DESC').getMany();
    return entities.map((entity) => RequirementMapper.toDomain(entity));
  }

  async countByFilters(filters: RequirementQueryFilters): Promise<number> {
    const qb = this.repository.createQueryBuilder('requirement');
    if (filters.customerId) {
      qb.andWhere('"requirement"."customer_id" = :customerId', { customerId: filters.customerId });
    }
    if (filters.conversationId) {
      qb.andWhere('"requirement"."conversation_id" = :conversationId', { conversationId: filters.conversationId });
    }
    if (filters.status) {
      qb.andWhere('"requirement"."status" = :status', { status: filters.status });
    }
    if (filters.category) {
      qb.andWhere('"requirement"."category" = :category', { category: filters.category });
    }
    if (filters.priority) {
      qb.andWhere('"requirement"."priority" = :priority', { priority: filters.priority });
    }

    return qb.getCount();
  }

  async save(requirement: Requirement): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 保存实体
      const entity = RequirementMapper.toEntity(requirement);
      await queryRunner.manager.save(entity);

      // 2. 获取未提交的领域事件
      const events = requirement.getUncommittedEvents();

      // 3. 保存到 domain_events 表（事件溯源）
      for (const event of events) {
        const eventEntity = new DomainEventEntity();
        eventEntity.id = event.eventId;
        eventEntity.aggregateId = requirement.id;
        eventEntity.aggregateType = 'Requirement';
        eventEntity.eventType = event.eventType;
        eventEntity.eventData = event.payload as Record<string, unknown>;
        eventEntity.occurredAt = event.occurredAt;
        eventEntity.version = event.version;

        await queryRunner.manager.save(eventEntity);
      }

      // 4. 保存到 outbox_events 表（Outbox 模式）
      await this.outboxEventBus.publishInTransaction(
        events,
        'Requirement',
        queryRunner,
      );

      // 5. 清空事件
      requirement.clearEvents();

      // 6. 提交事务
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async findBySpecification(
    specification: ISpecification<Requirement>,
    pagination?: RequirementPagination,
  ): Promise<Requirement[]> {
    // 获取所有需求并在内存中过滤（简单实现）
    // 生产环境应该将Specification转换为SQL查询
    const qb = this.repository.createQueryBuilder('requirement');

    if (pagination) {
      qb.take(pagination.limit);
      qb.skip(pagination.offset);
    }

    const entities = await qb.getMany();
    const requirements = entities.map((entity) => RequirementMapper.toDomain(entity));

    // 使用Specification过滤
    return requirements.filter((req) => specification.isSatisfiedBy(req));
  }
}
