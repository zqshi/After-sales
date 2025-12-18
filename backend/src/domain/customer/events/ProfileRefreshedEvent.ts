import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface ProfileRefreshedPayload {
  customerId: string;
  refreshedAt: Date;
  source: string;
}

export class ProfileRefreshedEvent extends DomainEvent<ProfileRefreshedPayload> {
  constructor(props: DomainEventProps, payload: ProfileRefreshedPayload) {
    super('ProfileRefreshed', props, payload);
  }
}
