import { DomainEvent } from '@domain/shared/DomainEvent';

interface ProblemResolvedPayload {
  problemId: string;
  conversationId: string;
  resolvedAt: Date;
  resolutionSummary?: string;
}

export class ProblemResolvedEvent extends DomainEvent<ProblemResolvedPayload> {
  constructor(metadata: { aggregateId: string }, payload: ProblemResolvedPayload) {
    super('ProblemResolved', metadata, payload);
  }
}
