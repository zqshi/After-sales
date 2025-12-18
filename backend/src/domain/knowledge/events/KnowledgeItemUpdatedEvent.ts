import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface KnowledgeItemUpdatedPayload {
  knowledgeId: string;
  updatedAt: Date;
  title?: string;
  category?: string;
}

export class KnowledgeItemUpdatedEvent extends DomainEvent<KnowledgeItemUpdatedPayload> {
  constructor(props: DomainEventProps, payload: KnowledgeItemUpdatedPayload) {
    super('KnowledgeItemUpdated', props, payload);
  }
}
