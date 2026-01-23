import { DomainEvent } from '@domain/shared/DomainEvent';

interface ProblemCreatedPayload {
  problemId: string;
  conversationId: string;
  customerId: string;
  title: string;
  status: string;
  intent?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export class ProblemCreatedEvent extends DomainEvent<ProblemCreatedPayload> {
  constructor(metadata: { aggregateId: string }, payload: ProblemCreatedPayload) {
    super('ProblemCreated', metadata, payload);
  }
}
