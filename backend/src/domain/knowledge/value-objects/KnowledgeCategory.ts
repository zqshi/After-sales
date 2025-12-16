import { ValueObject } from '@domain/shared/ValueObject';

export type KnowledgeCategoryType = 'faq' | 'guide' | 'policy' | 'troubleshooting' | 'product' | 'other';

interface KnowledgeCategoryProps {
  value: KnowledgeCategoryType;
}

export class KnowledgeCategory extends ValueObject<KnowledgeCategoryProps> {
  private constructor(props: KnowledgeCategoryProps) {
    super(props);
  }

  static create(value: string): KnowledgeCategory {
    const normalized = value.trim().toLowerCase() as KnowledgeCategoryType;
    const allowed: KnowledgeCategoryType[] = ['faq', 'guide', 'policy', 'troubleshooting', 'product', 'other'];
    if (!allowed.includes(normalized)) {
      throw new Error(`Unsupported knowledge category: ${value}`);
    }
    return new KnowledgeCategory({ value: normalized });
  }

  get value(): KnowledgeCategoryType {
    return this.props.value;
  }
}
