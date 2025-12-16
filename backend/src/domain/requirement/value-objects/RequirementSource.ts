import { ValueObject } from '@domain/shared/ValueObject';

export type RequirementSourceType = 'conversation' | 'ticket' | 'manual';

interface RequirementSourceProps {
  value: RequirementSourceType;
}

export class RequirementSource extends ValueObject<RequirementSourceProps> {
  private constructor(props: RequirementSourceProps) {
    super(props);
  }

  static create(value: string): RequirementSource {
    const normalized = value.trim().toLowerCase() as RequirementSourceType;
    const allowed: RequirementSourceType[] = ['conversation', 'ticket', 'manual'];
    if (!allowed.includes(normalized)) {
      throw new Error(`Unsupported requirement source: ${value}`);
    }
    return new RequirementSource({ value: normalized });
  }

  get value(): RequirementSourceType {
    return this.props.value;
  }
}
