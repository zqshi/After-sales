import { DomainEvent } from '@domain/shared/DomainEvent';

interface ProblemReopenedPayload {
  problemId: string;
  conversationId: string;
  reopenedAt: Date;
  reason?: string;
}

export class ProblemReopenedEvent extends DomainEvent<ProblemReopenedPayload> {
  constructor(metadata: { aggregateId: string }, payload: ProblemReopenedPayload) {
    super('ProblemReopened', metadata, payload);
  }
}
