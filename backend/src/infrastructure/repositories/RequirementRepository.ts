import { DataSource, Repository } from 'typeorm';

import { IRequirementRepository, RequirementQueryFilters } from '@domain/requirement/repositories/IRequirementRepository';
import { Requirement } from '@domain/requirement/models/Requirement';
import { RequirementEntity } from '@infrastructure/database/entities/RequirementEntity';
import { RequirementMapper } from './mappers/RequirementMapper';

export class RequirementRepository implements IRequirementRepository {
  private repository: Repository<RequirementEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(RequirementEntity);
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
    const entity = RequirementMapper.toEntity(requirement);
    await this.repository.save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
