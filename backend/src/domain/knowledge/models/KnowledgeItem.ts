import { AggregateRoot } from '@domain/shared/AggregateRoot';
import { KnowledgeCategory } from '../value-objects/KnowledgeCategory';
import { KnowledgeItemCreatedEvent } from '../events/KnowledgeItemCreatedEvent';
import { KnowledgeItemUpdatedEvent } from '../events/KnowledgeItemUpdatedEvent';
import { KnowledgeItemDeletedEvent } from '../events/KnowledgeItemDeletedEvent';

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

  static rehydrate(props: KnowledgeItemProps, id: string): KnowledgeItem {
    return new KnowledgeItem(props, id);
  }
}
