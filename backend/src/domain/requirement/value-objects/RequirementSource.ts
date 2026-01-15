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

  /**
   * 业务方法：判断是否来自客户
   *
   * conversation和ticket都是客户直接发起的
   */
  isCustomerInitiated(): boolean {
    return this.props.value === 'conversation' || this.props.value === 'ticket';
  }

  /**
   * 业务方法：判断是否手动创建
   */
  isManual(): boolean {
    return this.props.value === 'manual';
  }

  /**
   * 业务方法：判断是否来自对话
   */
  isFromConversation(): boolean {
    return this.props.value === 'conversation';
  }
}
