import { v4 as uuidv4 } from 'uuid';

export interface DomainEventProps {
  aggregateId: string;
  occurredAt?: Date;
  version?: number;
}

export abstract class DomainEvent<TPayload extends object = Record<string, unknown>> {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly occurredAt: Date;
  public readonly version: number;
  public readonly payload: TPayload;

  public get occurredOn(): Date {
    return this.occurredAt;
  }

  constructor(eventType: string, props: DomainEventProps, payload: TPayload) {
    this.eventId = uuidv4();
    this.eventType = eventType;
    this.aggregateId = props.aggregateId;
    this.occurredAt = props.occurredAt || new Date();
    this.version = props.version || 1;
    this.payload = payload;
  }
}
