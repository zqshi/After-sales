import { Requirement } from '@domain/requirement/models/Requirement';
import { Priority } from '@domain/requirement/value-objects/Priority';
import { RequirementSource } from '@domain/requirement/value-objects/RequirementSource';
import { RequirementEntity } from '@infrastructure/database/entities/RequirementEntity';

export class RequirementMapper {
  static toDomain(entity: RequirementEntity): Requirement {
    return Requirement.rehydrate(
      {
        customerId: entity.customerId,
        conversationId: entity.conversationId ?? undefined,
        title: entity.title,
        description: entity.description ?? undefined,
        category: entity.category,
        priority: Priority.create(entity.priority),
        status: entity.status as any,
        source: entity.source
          ? RequirementSource.create(entity.source)
          : RequirementSource.create('manual'),
        createdBy: entity.createdBy ?? undefined,
        metadata: entity.metadata ?? {},
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
      entity.id,
      entity.version,
    );
  }

  static toEntity(requirement: Requirement): RequirementEntity {
    const entity = new RequirementEntity();
    entity.id = requirement.id;
    entity.customerId = requirement.customerId;
    entity.conversationId = requirement.conversationId ?? null;
    entity.customerId = requirement.customerId;
    entity.title = requirement.title;
    entity.description = requirement.description ?? null;
    entity.category = requirement.category;
    entity.priority = requirement.priority.value;
    entity.status = requirement.status;
    entity.source = requirement.source.value;
    entity.createdBy = requirement.createdBy ?? null;
    entity.metadata = requirement.metadata ?? {};
    entity.version = requirement.version;
    entity.createdAt = requirement.createdAt;
    entity.updatedAt = requirement.updatedAt;
    return entity;
  }
}
