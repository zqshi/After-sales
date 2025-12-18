import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface SLAViolatedPayload {
  deadline: Date;
  violatedAt: Date;
  details?: string;
}

export class SLAViolatedEvent extends DomainEvent<SLAViolatedPayload> {
  constructor(props: DomainEventProps, payload: SLAViolatedPayload) {
    super('SLAViolated', props, payload);
  }
}
