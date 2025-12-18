import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface RiskLevelChangedPayload {
  customerId: string;
  previousLevel: 'low' | 'medium' | 'high';
  currentLevel: 'low' | 'medium' | 'high';
  evaluatedAt: Date;
}

export class RiskLevelChangedEvent extends DomainEvent<RiskLevelChangedPayload> {
  constructor(props: DomainEventProps, payload: RiskLevelChangedPayload) {
    super('RiskLevelChanged', props, payload);
  }
}
