import { ReviewRequest } from '../models/ReviewRequest';
import { ReviewStatus } from '../types';

export interface ReviewQueryFilters {
  conversationId?: string;
  status?: ReviewStatus;
}

export interface IReviewRequestRepository {
  findById(id: string): Promise<ReviewRequest | null>;
  findByFilters(filters: ReviewQueryFilters, pagination?: { limit: number; offset: number }): Promise<ReviewRequest[]>;
  findLatestPendingByConversation(conversationId: string): Promise<ReviewRequest | null>;
  save(review: ReviewRequest): Promise<void>;
}
