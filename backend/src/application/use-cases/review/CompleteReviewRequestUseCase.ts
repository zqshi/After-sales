import { IReviewRequestRepository } from '@domain/review/repositories/IReviewRequestRepository';
import { ReviewStatus } from '@domain/review/types';

export class CompleteReviewRequestUseCase {
  constructor(private readonly reviewRepository: IReviewRequestRepository) {}

  async execute(input: {
    reviewId: string;
    status: ReviewStatus;
    reviewerId?: string;
    reviewerNote?: string;
  }): Promise<void> {
    const review = await this.reviewRepository.findById(input.reviewId);
    if (!review) {
      throw new Error(`Review request ${input.reviewId} not found`);
    }

    review.complete(input.status, input.reviewerId, input.reviewerNote);
    await this.reviewRepository.save(review);
  }
}
