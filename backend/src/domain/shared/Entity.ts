import { v4 as uuidv4 } from 'uuid';

export abstract class Entity<T> {
  protected readonly _id: string;
  protected props: T;

  protected constructor(props: T, id?: string) {
    this._id = id || uuidv4();
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  public equals(other: Entity<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof this.constructor)) {
      return false;
    }

    return this._id === other._id;
  }
}
