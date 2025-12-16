import { DataSource, Repository } from 'typeorm';

import { IKnowledgeRepository, KnowledgeFilters } from '@domain/knowledge/repositories/IKnowledgeRepository';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeItemEntity } from '@infrastructure/database/entities/KnowledgeItemEntity';
import { KnowledgeItemMapper } from './mappers/KnowledgeItemMapper';

export class KnowledgeRepository implements IKnowledgeRepository {
  private repository: Repository<KnowledgeItemEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(KnowledgeItemEntity);
  }

  async save(item: KnowledgeItem): Promise<void> {
    const entity = KnowledgeItemMapper.toEntity(item);
    await this.repository.save(entity);
  }

  async findById(id: string): Promise<KnowledgeItem | null> {
    const entity = await this.repository.findOne({
      where: { id },
    });

    if (!entity) {
      return null;
    }

    return KnowledgeItemMapper.toDomain(entity);
  }

  private applyFilters(qb: ReturnType<Repository<KnowledgeItemEntity>['createQueryBuilder']>, filters: KnowledgeFilters): void {
    if (filters.category) {
      qb.andWhere('"knowledgeItem"."category" = :category', { category: filters.category });
    }
    if (filters.source) {
      qb.andWhere('"knowledgeItem"."source" = :source', { source: filters.source });
    }
    if (filters.tags && filters.tags.length > 0) {
      qb.andWhere(
        filters.tags.map((_, index) => `:tag${index} = ANY ("knowledgeItem"."tags")`).join(' OR '),
        Object.fromEntries(filters.tags.map((tag, index) => [`tag${index}`, tag])),
      );
    }
    if (filters.query) {
      qb.andWhere(
        '(LOWER("knowledgeItem"."title") LIKE :query OR LOWER("knowledgeItem"."content") LIKE :query)',
        { query: `%${filters.query.toLowerCase()}%` },
      );
    }
  }

  async findByFilters(filters: KnowledgeFilters, pagination?: { limit: number; offset: number }): Promise<KnowledgeItem[]> {
    const qb = this.repository.createQueryBuilder('knowledgeItem');
    this.applyFilters(qb, filters);
    qb.orderBy('"knowledgeItem"."updated_at"', 'DESC');
    if (pagination) {
      qb.take(pagination.limit);
      qb.skip(pagination.offset);
    }
    const entities = await qb.getMany();
    return entities.map((entity) => KnowledgeItemMapper.toDomain(entity));
  }

  async countByFilters(filters: KnowledgeFilters): Promise<number> {
    const qb = this.repository.createQueryBuilder('knowledgeItem').select('COUNT(*)', 'count');
    this.applyFilters(qb, filters);
    const result = await qb.getRawOne();
    return Number(result.count);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
