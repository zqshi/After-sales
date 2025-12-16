import { ValueObject } from '@domain/shared/ValueObject';

interface InsightProps {
  title: string;
  detail: string;
  createdAt: Date;
  source?: string;
}

export class Insight extends ValueObject<InsightProps> {
  private constructor(props: InsightProps) {
    super(props);
  }

  static create(data: Omit<InsightProps, 'createdAt'> & { createdAt?: Date }): Insight {
    return new Insight({
      title: data.title.trim(),
      detail: data.detail.trim(),
      createdAt: data.createdAt ?? new Date(),
      source: data.source,
    });
  }

  get title(): string {
    return this.props.title;
  }

  get detail(): string {
    return this.props.detail;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get source(): string | undefined {
    return this.props.source;
  }
}
