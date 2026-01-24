import { DataSource, Repository } from 'typeorm';

import { ITaskRepository, TaskFilters } from '@domain/task/repositories/ITaskRepository';
import { Task } from '@domain/task/models/Task';
import { TaskEntity } from '@infrastructure/database/entities/TaskEntity';
import { TaskMapper } from './mappers/TaskMapper';

export class TaskRepository implements ITaskRepository {
  private repository: Repository<TaskEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(TaskEntity);
  }

  async save(task: Task): Promise<void> {
    const entity = TaskMapper.toEntity(task);
    await this.repository.save(entity);
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
}
