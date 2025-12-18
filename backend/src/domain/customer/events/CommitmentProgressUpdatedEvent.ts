import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface CommitmentProgressUpdatedPayload {
  customerId: string;
  commitmentId: string;
  previousProgress: number;
  currentProgress: number;
  updatedAt: Date;
}

export class CommitmentProgressUpdatedEvent extends DomainEvent<CommitmentProgressUpdatedPayload> {
  constructor(props: DomainEventProps, payload: CommitmentProgressUpdatedPayload) {
    super('CommitmentProgressUpdated', props, payload);
  }
}
