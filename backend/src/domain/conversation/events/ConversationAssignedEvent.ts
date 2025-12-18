import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface ConversationAssignedPayload {
  agentId: string;
  assignedBy?: string;
  reason?: 'manual' | 'auto' | 'reassign';
  channel?: string;
  priority?: string;
  metadata?: Record<string, unknown>;
}

export class ConversationAssignedEvent extends DomainEvent<ConversationAssignedPayload> {
  constructor(props: DomainEventProps, payload: ConversationAssignedPayload) {
    super('ConversationAssigned', props, payload);
  }
}
