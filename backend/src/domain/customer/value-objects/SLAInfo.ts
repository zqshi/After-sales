import { ValueObject } from '@domain/shared/ValueObject';

interface SLAInfoProps {
  serviceLevel: 'gold' | 'silver' | 'bronze';
  responseTimeTargetMinutes: number;
  resolutionTimeTargetMinutes: number;
  lastReviewedAt?: Date;
}

export class SLAInfo extends ValueObject<SLAInfoProps> {
  private constructor(props: SLAInfoProps) {
    super(props);
  }

  static create(data: SLAInfoProps): SLAInfo {
    return new SLAInfo({
      serviceLevel: data.serviceLevel,
      responseTimeTargetMinutes: data.responseTimeTargetMinutes,
      resolutionTimeTargetMinutes: data.resolutionTimeTargetMinutes,
      lastReviewedAt: data.lastReviewedAt ?? new Date(),
    });
  }

  get serviceLevel(): SLAInfoProps['serviceLevel'] {
    return this.props.serviceLevel;
  }

  get responseTimeTargetMinutes(): number {
    return this.props.responseTimeTargetMinutes;
  }

  get resolutionTimeTargetMinutes(): number {
    return this.props.resolutionTimeTargetMinutes;
  }

  get lastReviewedAt(): Date | undefined {
    return this.props.lastReviewedAt;
  }
}
