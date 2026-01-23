import { ValueObject } from '@domain/shared/ValueObject';

interface CustomerLevelInfoProps {
  serviceLevel: 'gold' | 'silver' | 'bronze';
  responseTimeTargetMinutes: number;
  resolutionTimeTargetMinutes: number;
  lastReviewedAt?: Date;
}

export class CustomerLevelInfo extends ValueObject<CustomerLevelInfoProps> {
  private constructor(props: CustomerLevelInfoProps) {
    super(props);
  }

  static create(data: CustomerLevelInfoProps): CustomerLevelInfo {
    return new CustomerLevelInfo({
      serviceLevel: data.serviceLevel,
      responseTimeTargetMinutes: data.responseTimeTargetMinutes,
      resolutionTimeTargetMinutes: data.resolutionTimeTargetMinutes,
      lastReviewedAt: data.lastReviewedAt ?? new Date(),
    });
  }

  get serviceLevel(): CustomerLevelInfoProps['serviceLevel'] {
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
