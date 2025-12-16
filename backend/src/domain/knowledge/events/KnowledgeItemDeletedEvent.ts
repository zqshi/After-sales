import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface KnowledgeItemDeletedPayload {
  knowledgeId: string;
  deletedAt: Date;
}

export class KnowledgeItemDeletedEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: KnowledgeItemDeletedPayload) {
    super('KnowledgeItemDeleted', props, payload);
  }
}
