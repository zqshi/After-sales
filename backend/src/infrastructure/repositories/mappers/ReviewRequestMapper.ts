import { ReviewRequest } from '@domain/review/models/ReviewRequest';
import { ReviewStatus } from '@domain/review/types';
import { ReviewRequestEntity } from '@infrastructure/database/entities/ReviewRequestEntity';

export class ReviewRequestMapper {
  static toDomain(entity: ReviewRequestEntity): ReviewRequest {
    return ReviewRequest.rehydrate(
      {
        conversationId: entity.conversationId,
        status: entity.status as ReviewStatus,
        suggestion: entity.suggestion,
        confidence: entity.confidence ?? undefined,
        reviewerId: entity.reviewerId ?? undefined,
        reviewerNote: entity.reviewerNote ?? undefined,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        resolvedAt: entity.resolvedAt ?? undefined,
      },
      entity.id,
    );
  }

  static toEntity(review: ReviewRequest): ReviewRequestEntity {
    const entity = new ReviewRequestEntity();
    entity.id = review.id;
    entity.conversationId = review.conversationId;
    entity.status = review.status;
    entity.suggestion = review.suggestion;
    entity.confidence = review.confidence ?? null;
    entity.reviewerId = review.reviewerId ?? null;
    entity.reviewerNote = review.reviewerNote ?? null;
    entity.createdAt = review.createdAt;
    entity.updatedAt = review.updatedAt;
    entity.resolvedAt = review.resolvedAt ?? null;
    return entity;
  }
}
