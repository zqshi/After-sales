import { DomainEvent } from '@domain/shared/DomainEvent';

interface AgentReviewCompletedPayload {
  reviewId: string;
  conversationId: string;
  status: string;
  reviewerId?: string;
  reviewerNote?: string;
  resolvedAt: Date;
}

export class AgentReviewCompletedEvent extends DomainEvent<AgentReviewCompletedPayload> {
  constructor(metadata: { aggregateId: string }, payload: AgentReviewCompletedPayload) {
    super('AgentReviewCompleted', metadata, payload);
  }
}
