import { ValueObject } from '@domain/shared/ValueObject';

export type RequirementPriorityType = 'low' | 'medium' | 'high' | 'urgent';

interface PriorityProps {
  value: RequirementPriorityType;
}

export class Priority extends ValueObject<PriorityProps> {
  private static readonly LEVEL_WEIGHTS: Record<RequirementPriorityType, number> = {
    'low': 25,
    'medium': 50,
    'high': 75,
    'urgent': 100,
  };

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

  /**
   * 业务方法：判断是否紧急
   */
  isUrgent(): boolean {
    return this.props.value === 'urgent' || this.props.value === 'high';
  }

  /**
   * 业务方法：判断是否高优先级
   */
  isHighPriority(): boolean {
    return this.props.value === 'high';
  }

  /**
   * 业务方法：判断是否低优先级
   */
  isLowPriority(): boolean {
    return this.props.value === 'low';
  }

  /**
   * 业务方法：优先级比较
   */
  isHigherThan(other: Priority): boolean {
    return this.weight() > other.weight();
  }

  /**
   * 业务方法：获取权重
   */
  weight(): number {
    return Priority.LEVEL_WEIGHTS[this.props.value];
  }

  /**
   * 业务方法：升级优先级
   */
  escalate(): Priority {
    const escalationMap: Record<RequirementPriorityType, RequirementPriorityType> = {
      'low': 'medium',
      'medium': 'high',
      'high': 'urgent',
      'urgent': 'urgent', // 最高级无法再升级
    };
    return Priority.create(escalationMap[this.props.value]);
  }

  /**
   * 业务方法：降级优先级
   */
  deescalate(): Priority {
    const deescalationMap: Record<RequirementPriorityType, RequirementPriorityType> = {
      'low': 'low', // 最低级无法再降级
      'medium': 'low',
      'high': 'medium',
      'urgent': 'high',
    };
    return Priority.create(deescalationMap[this.props.value]);
  }
}
