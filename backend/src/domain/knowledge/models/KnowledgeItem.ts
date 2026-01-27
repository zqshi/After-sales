import { AggregateRoot } from '@domain/shared/AggregateRoot';

import { KnowledgeItemCreatedEvent } from '../events/KnowledgeItemCreatedEvent';
import { KnowledgeItemDeletedEvent } from '../events/KnowledgeItemDeletedEvent';
import { KnowledgeItemUpdatedEvent } from '../events/KnowledgeItemUpdatedEvent';
import { KnowledgeCategory } from '../value-objects/KnowledgeCategory';

interface KnowledgeItemProps {
  title: string;
  content: string;
  category: KnowledgeCategory;
  tags: string[];
  source: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
}

export class KnowledgeItem extends AggregateRoot<KnowledgeItemProps> {
  private constructor(props: KnowledgeItemProps, id?: string) {
    super(props, id);
  }

  static create(data: {
    title: string;
    content: string;
    category: KnowledgeCategory;
    tags?: string[];
    source: string;
    metadata?: Record<string, unknown>;
  }): KnowledgeItem {
    const now = new Date();
    const item = new KnowledgeItem({
      title: data.title.trim(),
      content: data.content.trim(),
      category: data.category,
      tags: data.tags ?? [],
      source: data.source,
      metadata: data.metadata ?? {},
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    });

    item.addDomainEvent(
      new KnowledgeItemCreatedEvent(
        { aggregateId: item.id },
        {
          knowledgeId: item.id,
          title: item.props.title,
          category: item.props.category.value,
          source: item.props.source,
        },
      ),
    );

    return item;
  }

  get title(): string {
    return this.props.title;
  }

  get content(): string {
    return this.props.content;
  }

  get category(): KnowledgeCategory {
    return this.props.category;
  }

  get tags(): string[] {
    return [...this.props.tags];
  }

  get source(): string {
    return this.props.source;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isArchived(): boolean {
    return this.props.isArchived;
  }

  update(data: {
    title?: string;
    content?: string;
    category?: KnowledgeCategory;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): void {
    if (data.title) {
      this.props.title = data.title.trim();
    }
    if (data.content) {
      this.props.content = data.content.trim();
    }
    if (data.category) {
      this.props.category = data.category;
    }
    if (data.tags) {
      this.props.tags = [...data.tags];
    }
    if (data.metadata) {
      this.props.metadata = data.metadata;
    }
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new KnowledgeItemUpdatedEvent(
        { aggregateId: this.id },
        {
          knowledgeId: this.id,
          updatedAt: this.props.updatedAt,
          title: data.title,
          category: data.category?.value,
        },
      ),
    );
  }

  archive(): void {
    if (this.props.isArchived) {
      return;
    }
    this.props.isArchived = true;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new KnowledgeItemDeletedEvent(
        { aggregateId: this.id },
        {
          knowledgeId: this.id,
          deletedAt: this.props.updatedAt,
        },
      ),
    );
  }

  /**
   * 业务方法：判断知识是否过期
   *
   * 规则：
   * - 创建超过180天（6个月）视为过期
   * - 最后更新超过90天（3个月）视为过期
   */
  isOutdated(): boolean {
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - this.props.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysSinceUpdate = Math.floor(
      (now.getTime() - this.props.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    // 创建超过180天，或最后更新超过90天
    return daysSinceCreation > 180 || daysSinceUpdate > 90;
  }

  /**
   * 业务方法：计算相关度评分
   *
   * @param query - 搜索关键词
   * @returns 相关度评分（0-1）
   */
  calculateRelevanceScore(query: string): number {
    const lowerQuery = query.toLowerCase();
    const lowerTitle = this.props.title.toLowerCase();
    const lowerContent = this.props.content.toLowerCase();
    const lowerTags = this.props.tags.map((t) => t.toLowerCase());

    let score = 0;

    // 标题完全匹配 +50分
    if (lowerTitle === lowerQuery) {
      score += 50;
    }
    // 标题包含查询词 +30分
    else if (lowerTitle.includes(lowerQuery)) {
      score += 30;
    }

    // 标签完全匹配 +20分
    if (lowerTags.includes(lowerQuery)) {
      score += 20;
    }

    // 内容包含查询词 +10分
    if (lowerContent.includes(lowerQuery)) {
      score += 10;
    }

    // 分词匹配（简单实现）
    const queryWords = lowerQuery.split(/\s+/);
    const matchCount = queryWords.filter((word) => {
      return (
        lowerTitle.includes(word) ||
        lowerContent.includes(word) ||
        lowerTags.some((tag) => tag.includes(word))
      );
    }).length;

    // 每个匹配词 +5分
    score += matchCount * 5;

    // 归一化到0-1
    return Math.min(score / 100, 1.0);
  }

  /**
   * 业务方法：判断是否属于某个分类
   */
  belongsToCategory(category: string): boolean {
    return this.props.category.value === category.toLowerCase();
  }

  /**
   * 业务方法：判断是否包含某个标签
   */
  hasTag(tag: string): boolean {
    return this.props.tags.some(
      (t) => t.toLowerCase() === tag.toLowerCase(),
    );
  }

  /**
   * 业务方法：判断是否包含任一标签
   */
  hasAnyTag(tags: string[]): boolean {
    return tags.some((tag) => this.hasTag(tag));
  }

  /**
   * 业务方法：判断是否包含所有标签
   */
  hasAllTags(tags: string[]): boolean {
    return tags.every((tag) => this.hasTag(tag));
  }

  /**
   * 业务方法：判断是否为常见问题（FAQ）
   */
  isFAQ(): boolean {
    return this.belongsToCategory('faq') || this.hasTag('faq');
  }

  /**
   * 业务方法：判断是否为技术文档
   */
  isTechnicalDoc(): boolean {
    return (
      this.belongsToCategory('technical') || this.hasTag('technical')
    );
  }

  /**
   * 业务方法：获取内容摘要
   *
   * @param maxLength - 最大长度（默认200字符）
   * @returns 内容摘要
   */
  getSummary(maxLength: number = 200): string {
    if (this.props.content.length <= maxLength) {
      return this.props.content;
    }
    return this.props.content.substring(0, maxLength) + '...';
  }

  /**
   * 业务方法：判断知识内容是否过短
   *
   * 规则：内容少于50字符视为过短，可能需要补充
   */
  isTooShort(): boolean {
    return this.props.content.length < 50;
  }

  /**
   * 业务方法：判断是否需要审核
   *
   * 规则：
   * - 新创建（创建时间 < 1小时）
   * - 内容过短
   * - 无标签
   */
  needsReview(): boolean {
    const hoursSinceCreation = Math.floor(
      (new Date().getTime() - this.props.createdAt.getTime()) /
        (1000 * 60 * 60),
    );

    if (hoursSinceCreation < 1) {
      return true; // 新创建的知识
    }

    if (this.isTooShort()) {
      return true; // 内容过短
    }

    if (this.props.tags.length === 0) {
      return true; // 无标签
    }

    return false;
  }

  /**
   * 业务方法：添加标签
   */
  addTag(tag: string): void {
    if (!this.hasTag(tag)) {
      this.props.tags.push(tag.trim());
      this.props.updatedAt = new Date();
    }
  }

  /**
   * 业务方法：移除标签
   */
  removeTag(tag: string): void {
    const index = this.props.tags.findIndex(
      (t) => t.toLowerCase() === tag.toLowerCase(),
    );
    if (index !== -1) {
      this.props.tags.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  static rehydrate(props: KnowledgeItemProps, id: string): KnowledgeItem {
    return new KnowledgeItem(props, id);
  }
}
