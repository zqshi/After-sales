import { v4 as uuidv4 } from 'uuid';

import { DomainEvent } from './DomainEvent';

export abstract class AggregateRoot<T> {
  protected readonly _id: string;
  protected props: T;
  private domainEvents: DomainEvent[] = [];

  protected constructor(props: T, id?: string) {
    this._id = id || uuidv4();
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  public getUncommittedEvents(): DomainEvent[] {
    return [...this.domainEvents];
  }

  public clearEvents(): void {
    this.domainEvents = [];
  }

  public equals(other: AggregateRoot<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof this.constructor)) {
      return false;
    }

    return this._id === other._id;
  }
}
