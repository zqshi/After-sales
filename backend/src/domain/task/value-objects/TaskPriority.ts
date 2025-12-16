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
}
