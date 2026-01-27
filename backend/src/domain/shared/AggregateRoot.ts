import { v4 as uuidv4 } from 'uuid';

import { DomainEvent } from './DomainEvent';

export abstract class AggregateRoot<T> {
  protected readonly _id: string;
  protected props: T;
  protected _version: number = 0; // 乐观锁版本号
  private domainEvents: DomainEvent<object>[] = [];

  protected constructor(props: T, id?: string, version?: number) {
    this._id = id || uuidv4();
    this.props = props;
    this._version = version ?? 0;
  }

  get id(): string {
    return this._id;
  }

  get version(): number {
    return this._version;
  }

  /**
   * 增加版本号（在每次修改聚合根时调用）
   */
  protected incrementVersion(): void {
    this._version++;
  }

  protected addDomainEvent(event: DomainEvent<object>): void {
    this.domainEvents.push(event);
  }

  public getUncommittedEvents(): DomainEvent<object>[] {
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
