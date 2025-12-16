import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface KnowledgeItemCreatedPayload {
  knowledgeId: string;
  title: string;
  category: string;
  source: string;
}

export class KnowledgeItemCreatedEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: KnowledgeItemCreatedPayload) {
    super('KnowledgeItemCreated', props, payload);
  }
}
