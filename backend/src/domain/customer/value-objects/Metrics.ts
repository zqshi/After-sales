import { ValueObject } from '@domain/shared/ValueObject';

interface MetricsProps {
  satisfactionScore: number;
  issueCount: number;
  averageResolutionMinutes: number;
  lastUpdated?: Date;
}

export class Metrics extends ValueObject<MetricsProps> {
  private constructor(props: MetricsProps) {
    super(props);
  }

  static create(data: MetricsProps): Metrics {
    return new Metrics({
      satisfactionScore: Math.max(0, Math.min(100, data.satisfactionScore)),
      issueCount: Math.max(0, data.issueCount),
      averageResolutionMinutes: Math.max(0, data.averageResolutionMinutes),
      lastUpdated: data.lastUpdated ?? new Date(),
    });
  }

  get satisfactionScore(): number {
    return this.props.satisfactionScore;
  }

  get issueCount(): number {
    return this.props.issueCount;
  }

  get averageResolutionMinutes(): number {
    return this.props.averageResolutionMinutes;
  }

  get lastUpdated(): Date | undefined {
    return this.props.lastUpdated;
  }
}
