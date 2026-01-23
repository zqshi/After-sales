import { ReviewRequest } from '@domain/review/models/ReviewRequest';
import { IReviewRequestRepository } from '@domain/review/repositories/IReviewRequestRepository';

export class CreateReviewRequestUseCase {
  constructor(private readonly reviewRepository: IReviewRequestRepository) {}

  async execute(input: {
    conversationId: string;
    suggestion: Record<string, unknown>;
    confidence?: number;
  }): Promise<ReviewRequest> {
    const review = ReviewRequest.create({
      conversationId: input.conversationId,
      suggestion: input.suggestion,
      confidence: input.confidence,
    });
    await this.reviewRepository.save(review);
    return review;
  }
}
