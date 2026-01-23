import { DomainEvent } from '@domain/shared/DomainEvent';

interface AgentReviewRequestedPayload {
  reviewId: string;
  conversationId: string;
  suggestion: Record<string, unknown>;
  confidence?: number;
  createdAt: Date;
}

export class AgentReviewRequestedEvent extends DomainEvent<AgentReviewRequestedPayload> {
  constructor(metadata: { aggregateId: string }, payload: AgentReviewRequestedPayload) {
    super('AgentReviewRequested', metadata, payload);
  }
}
