import { ValueObject } from '@domain/shared/ValueObject';

interface QualityScoreProps {
  timeliness: number;
  completeness: number;
  satisfaction: number;
}

export class QualityScore extends ValueObject<QualityScoreProps> {
  private constructor(props: QualityScoreProps) {
    super(props);
  }

  static create(data: QualityScoreProps): QualityScore {
    const clamp = (value: number) => Math.max(0, Math.min(100, value));
    return new QualityScore({
      timeliness: clamp(data.timeliness),
      completeness: clamp(data.completeness),
      satisfaction: clamp(data.satisfaction),
    });
  }

  get timeliness(): number {
    return this.props.timeliness;
  }

  get completeness(): number {
    return this.props.completeness;
  }

  get satisfaction(): number {
    return this.props.satisfaction;
  }

  get overall(): number {
    return Math.round(
      (this.props.timeliness + this.props.completeness + this.props.satisfaction) / 3,
    );
  }
}
