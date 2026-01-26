import { DataSource, Repository } from 'typeorm';

import { ITaskRepository, TaskFilters, TaskPagination } from '@domain/task/repositories/ITaskRepository';
import { Task } from '@domain/task/models/Task';
import { TaskEntity } from '@infrastructure/database/entities/TaskEntity';
import { DomainEventEntity } from '@infrastructure/database/entities/DomainEventEntity';
import { OutboxEventBus } from '@infrastructure/events/OutboxEventBus';
import { TaskMapper } from './mappers/TaskMapper';
import type { ISpecification } from '@domain/shared/Specification';

export class TaskRepository implements ITaskRepository {
  private repository: Repository<TaskEntity>;
  private outboxEventBus: OutboxEventBus;

  constructor(private dataSource: DataSource, outboxEventBus: OutboxEventBus) {
    this.repository = this.dataSource.getRepository(TaskEntity);
    this.outboxEventBus = outboxEventBus;
  }

  async save(task: Task): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 保存实体
      const entity = TaskMapper.toEntity(task);
      await queryRunner.manager.save(entity);

      // 2. 获取未提交的领域事件
      const events = task.getUncommittedEvents();

      // 3. 保存到 domain_events 表（事件溯源）
      for (const event of events) {
        const eventEntity = new DomainEventEntity();
        eventEntity.id = event.eventId;
        eventEntity.aggregateId = task.id;
        eventEntity.aggregateType = 'Task';
        eventEntity.eventType = event.eventType;
        eventEntity.eventData = event.payload as Record<string, unknown>;
        eventEntity.occurredAt = event.occurredAt;
        eventEntity.version = event.version;

        await queryRunner.manager.save(eventEntity);
      }

      // 4. 保存到 outbox_events 表（Outbox 模式）
      await this.outboxEventBus.publishInTransaction(
        events,
        'Task',
        queryRunner,
      );

      // 5. 清空事件
      task.clearEvents();

      // 6. 提交事务
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string): Promise<Task | null> {
    const entity = await this.repository.findOne({
      where: { id },
    });

    if (!entity) {
      return null;
    }

    return TaskMapper.toDomain(entity);
  }

  async findByFilters(filters: TaskFilters, pagination?: { limit: number; offset: number }): Promise<Task[]> {
    const qb = this.repository.createQueryBuilder('task');
    if (filters.assigneeId) {
      qb.andWhere('task.assignee_id = :assigneeId', { assigneeId: filters.assigneeId });
    }
    if (filters.conversationId) {
      qb.andWhere('task.conversation_id = :conversationId', { conversationId: filters.conversationId });
    }
    if (filters.requirementId) {
      qb.andWhere("task.metadata ->> 'requirementId' = :requirementId", { requirementId: filters.requirementId });
    }
    if (filters.status) {
      qb.andWhere('task.status = :status', { status: filters.status });
    }
    if (filters.priority) {
      qb.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    qb.orderBy('task.updated_at', 'DESC');
    if (pagination) {
      qb.take(pagination.limit);
      qb.skip(pagination.offset);
    }

    const entities = await qb.getMany();
    return entities.map((entity) => TaskMapper.toDomain(entity));
  }

  async countByFilters(filters: TaskFilters): Promise<number> {
    const qb = this.repository.createQueryBuilder('task').select('COUNT(*)', 'count');
    if (filters.assigneeId) {
      qb.andWhere('task.assignee_id = :assigneeId', { assigneeId: filters.assigneeId });
    }
    if (filters.conversationId) {
      qb.andWhere('task.conversation_id = :conversationId', { conversationId: filters.conversationId });
    }
    if (filters.requirementId) {
      qb.andWhere("task.metadata ->> 'requirementId' = :requirementId", { requirementId: filters.requirementId });
    }
    if (filters.status) {
      qb.andWhere('task.status = :status', { status: filters.status });
    }
    if (filters.priority) {
      qb.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    const result = await qb.getRawOne();
    return Number(result.count ?? 0);
  }

  async findByConversationId(conversationId: string): Promise<Task[]> {
    return this.findByFilters({ conversationId });
  }

  async searchByQuery(
    query: string,
    pagination?: { limit?: number; offset?: number },
  ): Promise<Task[]> {
    const qb = this.repository.createQueryBuilder('task');
    const like = `%${query.toLowerCase()}%`;
    qb.where(
      '(LOWER(task.title) LIKE :query OR LOWER(COALESCE(task.description, \'\')) LIKE :query OR CAST(task.metadata AS text) ILIKE :query)',
      { query: like },
    );
    qb.orderBy('task.updated_at', 'DESC');
    if (pagination?.limit !== undefined) {
      qb.take(pagination.limit);
    }
    if (pagination?.offset !== undefined) {
      qb.skip(pagination.offset);
    }
    const entities = await qb.getMany();
    return entities.map((entity) => TaskMapper.toDomain(entity));
  }

  async findBySpecification(
    specification: ISpecification<Task>,
    pagination?: TaskPagination,
  ): Promise<Task[]> {
    // 获取所有任务并在内存中过滤（简单实现）
    // 生产环境应该将Specification转换为SQL查询
    const qb = this.repository.createQueryBuilder('task');

    if (pagination) {
      qb.take(pagination.limit);
      qb.skip(pagination.offset);
    }

    const entities = await qb.getMany();
    const tasks = entities.map((entity) => TaskMapper.toDomain(entity));

    // 使用Specification过滤
    return tasks.filter((task) => specification.isSatisfiedBy(task));
  }
}
