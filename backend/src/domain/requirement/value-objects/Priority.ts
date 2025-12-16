import { ValueObject } from '@domain/shared/ValueObject';

export type RequirementPriorityType = 'low' | 'medium' | 'high' | 'urgent';

interface PriorityProps {
  value: RequirementPriorityType;
}

export class Priority extends ValueObject<PriorityProps> {
  private constructor(props: PriorityProps) {
    super(props);
  }

  static create(value: string): Priority {
    const normalized = value.trim().toLowerCase() as RequirementPriorityType;
    const allowed: RequirementPriorityType[] = ['low', 'medium', 'high', 'urgent'];
    if (!allowed.includes(normalized)) {
      throw new Error(`Unsupported priority: ${value}`);
    }
    return new Priority({ value: normalized });
  }

  get value(): RequirementPriorityType {
    return this.props.value;
  }
}
