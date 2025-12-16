import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeItemEntity } from '@infrastructure/database/entities/KnowledgeItemEntity';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';

export class KnowledgeItemMapper {
  static toDomain(entity: KnowledgeItemEntity): KnowledgeItem {
    return KnowledgeItem.rehydrate(
      {
        title: entity.title,
        content: entity.content,
        category: KnowledgeCategory.create(entity.category),
        tags: entity.tags ?? [],
        source: entity.source,
        metadata: entity.metadata ?? {},
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        isArchived: entity.isArchived,
      },
      entity.id,
    );
  }

  static toEntity(item: KnowledgeItem): KnowledgeItemEntity {
    const entity = new KnowledgeItemEntity();
    entity.id = item.id;
    entity.title = item.title;
    entity.content = item.content;
    entity.category = item.category.value;
    entity.tags = item.tags;
    entity.source = item.source;
    entity.metadata = item.metadata ?? {};
    entity.isArchived = item.isArchived;
    entity.createdAt = item.createdAt;
    entity.updatedAt = item.updatedAt;
    return entity;
  }
}
