import { describe, expect, it } from 'vitest';
import { ReviewRequestMapper } from '@infrastructure/repositories/mappers/ReviewRequestMapper';
import { ReviewRequest } from '@domain/review/models/ReviewRequest';

describe('ReviewRequestMapper', () => {
  it('maps entity to domain and back', () => {
    const entity: any = {
      id: 'r1',
      conversationId: 'c1',
      status: 'pending',
      suggestion: 'suggest',
      confidence: 0.5,
      reviewerId: null,
      reviewerNote: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
      resolvedAt: null,
    };

    const domain = ReviewRequestMapper.toDomain(entity);
    expect(domain.id).toBe('r1');

    const back = ReviewRequestMapper.toEntity(domain);
    expect(back.conversationId).toBe('c1');
    expect(back.confidence).toBe(0.5);
  });

  it('preserves resolved fields', () => {
    const review = ReviewRequest.create({
      conversationId: 'c2',
      suggestion: 's',
      confidence: 0.7,
    });
    review.complete('approved', 'reviewer', 'ok');

    const entity = ReviewRequestMapper.toEntity(review);
    expect(entity.resolvedAt).not.toBeNull();
  });
});
