import { AggregateRoot } from '@domain/shared/AggregateRoot';

import { ProblemCreatedEvent } from '../events/ProblemCreatedEvent';
import { ProblemReopenedEvent } from '../events/ProblemReopenedEvent';
import { ProblemResolvedEvent } from '../events/ProblemResolvedEvent';
import { ProblemStatusChangedEvent } from '../events/ProblemStatusChangedEvent';
import { ProblemStatus } from '../types';

interface ProblemProps {
  customerId: string;
  conversationId: string;
  title: string;
  description?: string;
  status: ProblemStatus;
  intent?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export class Problem extends AggregateRoot<ProblemProps> {
  private constructor(props: ProblemProps, id?: string) {
    super(props, id);
  }

  static create(data: {
    customerId: string;
    conversationId: string;
    title: string;
    description?: string;
    intent?: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }): Problem {
    const now = new Date();
    const problem = new Problem({
      customerId: data.customerId,
      conversationId: data.conversationId,
      title: data.title.trim(),
      description: data.description?.trim(),
      status: 'new',
      intent: data.intent,
      confidence: data.confidence,
      metadata: data.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    });

    problem.addDomainEvent(
      new ProblemCreatedEvent(
        { aggregateId: problem.id },
        {
          problemId: problem.id,
          conversationId: data.conversationId,
          customerId: data.customerId,
          title: problem.title,
          status: problem.status,
          intent: data.intent,
          confidence: data.confidence,
          metadata: problem.metadata,
        },
      ),
    );

    return problem;
  }

  static rehydrate(props: ProblemProps, id: string): Problem {
    return new Problem(props, id);
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get conversationId(): string {
    return this.props.conversationId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get status(): ProblemStatus {
    return this.props.status;
  }

  get intent(): string | undefined {
    return this.props.intent;
  }

  get confidence(): number | undefined {
    return this.props.confidence;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata;
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

  updateStatus(status: ProblemStatus, reason?: string): void {
    if (this.props.status === status) {
      return;
    }

    const previous = this.props.status;
    this.props.status = status;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ProblemStatusChangedEvent(
        { aggregateId: this.id },
        {
          problemId: this.id,
          conversationId: this.conversationId,
          previousStatus: previous,
          currentStatus: status,
          reason,
          updatedAt: this.props.updatedAt,
        },
      ),
    );

    if (status === 'resolved') {
      this.props.resolvedAt = this.props.updatedAt;
      this.addDomainEvent(
        new ProblemResolvedEvent(
          { aggregateId: this.id },
          {
            problemId: this.id,
            conversationId: this.conversationId,
            resolvedAt: this.props.resolvedAt,
            resolutionSummary: reason,
          },
        ),
      );
    }

    if (status === 'reopened') {
      this.props.resolvedAt = undefined;
      this.addDomainEvent(
        new ProblemReopenedEvent(
          { aggregateId: this.id },
          {
            problemId: this.id,
            conversationId: this.conversationId,
            reopenedAt: this.props.updatedAt,
            reason,
          },
        ),
      );
    }
  }

  markInProgress(reason?: string): void {
    this.updateStatus('in_progress', reason);
  }

  markWaitingCustomer(reason?: string): void {
    this.updateStatus('waiting_customer', reason);
  }

  resolve(reason?: string): void {
    this.updateStatus('resolved', reason);
  }

  reopen(reason?: string): void {
    this.updateStatus('reopened', reason);
  }

  updateMetadata(metadata: Record<string, unknown>): void {
    if (!metadata || Object.keys(metadata).length === 0) {
      return;
    }
    this.props.metadata = {
      ...(this.props.metadata || {}),
      ...metadata,
    };
    this.props.updatedAt = new Date();
  }
}
