import { ValueObject } from '@domain/shared/ValueObject';

interface ServiceRecordProps {
  title: string;
  description: string;
  recordedAt: Date;
  ownerId?: string;
  outcome?: string;
}

export class ServiceRecord extends ValueObject<ServiceRecordProps> {
  private constructor(props: ServiceRecordProps) {
    super(props);
  }

  static create(data: Omit<ServiceRecordProps, 'recordedAt'> & { recordedAt?: Date }): ServiceRecord {
    return new ServiceRecord({
      title: data.title.trim(),
      description: data.description.trim(),
      recordedAt: data.recordedAt ?? new Date(),
      ownerId: data.ownerId,
      outcome: data.outcome,
    });
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get recordedAt(): Date {
    return this.props.recordedAt;
  }

  get ownerId(): string | undefined {
    return this.props.ownerId;
  }

  get outcome(): string | undefined {
    return this.props.outcome;
  }
}
