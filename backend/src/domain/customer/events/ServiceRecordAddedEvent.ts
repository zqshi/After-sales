import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface ServiceRecordAddedPayload {
  customerId: string;
  recordId: string;
  title: string;
  recordedAt: Date;
}

export class ServiceRecordAddedEvent extends DomainEvent {
  constructor(props: DomainEventProps, payload: ServiceRecordAddedPayload) {
    super('ServiceRecordAdded', props, payload);
  }
}
