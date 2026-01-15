import { ValueObject } from '@domain/shared/ValueObject';

export type TaskPriorityType = 'low' | 'medium' | 'high' | 'urgent';

interface TaskPriorityProps {
  value: TaskPriorityType;
}

export class TaskPriority extends ValueObject<TaskPriorityProps> {
  private constructor(props: TaskPriorityProps) {
    super(props);
  }

  static create(value: string): TaskPriority {
    const normalized = value.trim().toLowerCase() as TaskPriorityType;
    const allowed: TaskPriorityType[] = ['low', 'medium', 'high', 'urgent'];
    if (!allowed.includes(normalized)) {
      throw new Error(`Unsupported task priority: ${value}`);
    }
    return new TaskPriority({ value: normalized });
  }

  get value(): TaskPriorityType {
    return this.props.value;
  }

  /**
   * 业务方法：判断是否高优先级（high或urgent）
   */
  isHigh(): boolean {
    return this.props.value === 'high' || this.props.value === 'urgent';
  }

  /**
   * 业务方法：判断是否紧急
   */
  isUrgent(): boolean {
    return this.props.value === 'urgent';
  }

  /**
   * 业务方法：判断是否低优先级
   */
  isLow(): boolean {
    return this.props.value === 'low';
  }

  /**
   * 业务方法：优先级升级
   */
  escalate(): TaskPriority {
    const escalationMap: Record<TaskPriorityType, TaskPriorityType> = {
      low: 'medium',
      medium: 'high',
      high: 'urgent',
      urgent: 'urgent', // 已是最高级，不再升级
    };
    return TaskPriority.create(escalationMap[this.props.value]);
  }

  /**
   * 业务方法：优先级降级
   */
  deescalate(): TaskPriority {
    const deescalationMap: Record<TaskPriorityType, TaskPriorityType> = {
      urgent: 'high',
      high: 'medium',
      medium: 'low',
      low: 'low', // 已是最低级，不再降级
    };
    return TaskPriority.create(deescalationMap[this.props.value]);
  }
}
