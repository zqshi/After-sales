import { Problem } from '@domain/problem/models/Problem';
import { ProblemStatus } from '@domain/problem/types';
import { ProblemEntity } from '@infrastructure/database/entities/ProblemEntity';

export class ProblemMapper {
  static toDomain(entity: ProblemEntity): Problem {
    return Problem.rehydrate(
      {
        customerId: entity.customerId,
        conversationId: entity.conversationId,
        title: entity.title,
        description: entity.description ?? undefined,
        status: entity.status as ProblemStatus,
        intent: entity.intent ?? undefined,
        confidence: entity.confidence ?? undefined,
        metadata: entity.metadata,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        resolvedAt: entity.resolvedAt ?? undefined,
      },
      entity.id,
    );
  }

  static toEntity(problem: Problem): ProblemEntity {
    const entity = new ProblemEntity();
    entity.id = problem.id;
    entity.customerId = problem.customerId;
    entity.conversationId = problem.conversationId;
    entity.title = problem.title;
    entity.description = problem.description ?? null;
    entity.status = problem.status;
    entity.intent = problem.intent ?? null;
    entity.confidence = problem.confidence ?? null;
    entity.metadata = problem.metadata ?? {};
    entity.createdAt = problem.createdAt;
    entity.updatedAt = problem.updatedAt;
    entity.resolvedAt = problem.resolvedAt ?? null;
    return entity;
  }
}
