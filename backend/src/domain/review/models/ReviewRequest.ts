import { AggregateRoot } from '@domain/shared/AggregateRoot';
import { ReviewStatus } from '../types';
import { AgentReviewRequestedEvent } from '../events/AgentReviewRequestedEvent';
import { AgentReviewCompletedEvent } from '../events/AgentReviewCompletedEvent';

interface ReviewRequestProps {
  conversationId: string;
  status: ReviewStatus;
  suggestion: Record<string, unknown>;
  confidence?: number;
  reviewerId?: string;
  reviewerNote?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export class ReviewRequest extends AggregateRoot<ReviewRequestProps> {
  private constructor(props: ReviewRequestProps, id?: string) {
    super(props, id);
  }

  static create(data: {
    conversationId: string;
    suggestion: Record<string, unknown>;
    confidence?: number;
  }): ReviewRequest {
    const now = new Date();
    const review = new ReviewRequest({
      conversationId: data.conversationId,
      status: 'pending',
      suggestion: data.suggestion,
      confidence: data.confidence,
      createdAt: now,
      updatedAt: now,
    });

    review.addDomainEvent(
      new AgentReviewRequestedEvent(
        { aggregateId: review.id },
        {
          reviewId: review.id,
          conversationId: data.conversationId,
          suggestion: data.suggestion,
          confidence: data.confidence,
          createdAt: now,
        },
      ),
    );

    return review;
  }

  static rehydrate(props: ReviewRequestProps, id: string): ReviewRequest {
    return new ReviewRequest(props, id);
  }

  get conversationId(): string {
    return this.props.conversationId;
  }

  get status(): ReviewStatus {
    return this.props.status;
  }

  get suggestion(): Record<string, unknown> {
    return this.props.suggestion;
  }

  get confidence(): number | undefined {
    return this.props.confidence;
  }

  get reviewerId(): string | undefined {
    return this.props.reviewerId;
  }

  get reviewerNote(): string | undefined {
    return this.props.reviewerNote;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get resolvedAt(): Date | undefined {
    return this.props.resolvedAt;
  }

  complete(status: ReviewStatus, reviewerId?: string, reviewerNote?: string): void {
    if (this.props.status === status) {
      return;
    }
    this.props.status = status;
    this.props.reviewerId = reviewerId;
    this.props.reviewerNote = reviewerNote;
    this.props.updatedAt = new Date();
    this.props.resolvedAt = this.props.updatedAt;

    this.addDomainEvent(
      new AgentReviewCompletedEvent(
        { aggregateId: this.id },
        {
          reviewId: this.id,
          conversationId: this.conversationId,
          status,
          reviewerId,
          reviewerNote,
          resolvedAt: this.props.resolvedAt,
        },
      ),
    );
  }
}
