import { DomainEvent } from '@domain/shared/DomainEvent';

interface ProblemStatusChangedPayload {
  problemId: string;
  conversationId: string;
  previousStatus: string;
  currentStatus: string;
  reason?: string;
  updatedAt: Date;
}

export class ProblemStatusChangedEvent extends DomainEvent<ProblemStatusChangedPayload> {
  constructor(metadata: { aggregateId: string }, payload: ProblemStatusChangedPayload) {
    super('ProblemStatusChanged', metadata, payload);
  }
}
