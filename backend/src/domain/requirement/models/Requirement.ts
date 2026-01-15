import { AggregateRoot } from '@domain/shared/AggregateRoot';
import { RequirementSource } from '../value-objects/RequirementSource';
import { Priority } from '../value-objects/Priority';
import { RequirementCreatedEvent } from '../events/RequirementCreatedEvent';
import { RequirementStatusChangedEvent } from '../events/RequirementStatusChangedEvent';
import { RequirementPriorityChangedEvent } from '../events/RequirementPriorityChangedEvent';

export type RequirementStatus = 'pending' | 'approved' | 'resolved' | 'ignored' | 'cancelled';

interface RequirementProps {
  customerId: string;
  conversationId?: string;
  title: string;
  description?: string;
  category: string;
  priority: Priority;
  status: RequirementStatus;
  source: RequirementSource;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class Requirement extends AggregateRoot<RequirementProps> {
  private constructor(props: RequirementProps, id?: string) {
    super(props, id);
  }

  static create(data: {
    customerId: string;
    conversationId?: string;
    title: string;
    description?: string;
    category: string;
    priority?: Priority;
    source?: RequirementSource;
    createdBy?: string;
    metadata?: Record<string, unknown>;
  }): Requirement {
    const now = new Date();
    const priority = data.priority ?? Priority.create('medium');
    const source = data.source ?? RequirementSource.create('manual');

    const requirement = new Requirement(
      {
        customerId: data.customerId,
        conversationId: data.conversationId,
        title: data.title.trim(),
        description: data.description?.trim(),
        category: data.category,
        priority,
        status: 'pending',
        source,
        createdBy: data.createdBy,
        metadata: data.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      },
    );

    requirement.addDomainEvent(
      new RequirementCreatedEvent(
        { aggregateId: requirement.id },
        {
          requirementId: requirement.id,
          customerId: requirement.props.customerId,
          conversationId: requirement.props.conversationId,  // 包含conversationId
          title: requirement.props.title,
          category: requirement.props.category,
          priority: requirement.props.priority.value,  // 包含priority用于决策
          source: requirement.props.source.value,
        },
      ),
    );

    return requirement;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get conversationId(): string | undefined {
    return this.props.conversationId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get category(): string {
    return this.props.category;
  }

  get priority(): Priority {
    return this.props.priority;
  }

  get status(): RequirementStatus {
    return this.props.status;
  }

  get source(): RequirementSource {
    return this.props.source;
  }

  get createdBy(): string | undefined {
    return this.props.createdBy;
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

  updateStatus(status: RequirementStatus): void {
    if (this.props.status === status) {
      return;
    }

    const previous = this.props.status;
    this.props.status = status;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new RequirementStatusChangedEvent(
        { aggregateId: this.id },
        {
          requirementId: this.id,
          previousStatus: previous,
          currentStatus: status,
          updatedAt: this.props.updatedAt,
        },
      ),
    );
  }

  changePriority(priority: Priority): void {
    if (this.props.priority.equals(priority)) {
      return;
    }

    const previous = this.props.priority.value;
    this.props.priority = priority;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new RequirementPriorityChangedEvent(
        { aggregateId: this.id },
        {
          requirementId: this.id,
          previousPriority: previous,
          currentPriority: priority.value,
          changedAt: this.props.updatedAt,
        },
      ),
    );
  }

  resolve(): void {
    this.updateStatus('resolved');
  }

  ignore(): void {
    this.updateStatus('ignored');
  }

  cancel(): void {
    this.updateStatus('cancelled');
  }

  /**
   * 关联到对话
   * 当内部需求需要与客户沟通时，将其关联到Conversation
   */
  associateWithConversation(conversationId: string): void {
    if (this.props.conversationId === conversationId) {
      return;
    }
    this.props.conversationId = conversationId;
    this.props.updatedAt = new Date();
  }

  /**
   * 业务规则：是否应该自动创建Task
   *
   * 规则：
   * 1. 高优先级（urgent/high）→ 自动创建
   * 2. 来自客户对话（source=conversation/customer）→ 自动创建
   * 3. 其他情况（低优先级、手动创建）→ 不自动创建
   */
  shouldAutoCreateTask(): boolean {
    // 规则1：紧急或高优先级 → 自动创建
    if (this.props.priority.isUrgent()) {
      return true;
    }

    // 规则2：来自客户 → 自动创建
    if (this.props.source.isCustomerInitiated()) {
      return true;
    }

    // 规则3：其他情况（低优先级、手动创建）→ 不自动创建
    return false;
  }

  /**
   * 业务规则：是否需要与客户沟通
   *
   * 判断该需求是否需要创建Conversation与客户沟通
   */
  needsCustomerCommunication(): boolean {
    // 如果已有关联对话，不需要再创建
    if (this.props.conversationId) {
      return false;
    }

    // 高优先级需求需要主动沟通
    if (this.props.priority.isUrgent()) {
      return true;
    }

    // 技术类、功能类需求可能需要确认细节
    const communicationCategories = ['technical', 'feature', 'bug'];
    if (communicationCategories.includes(this.props.category)) {
      return true;
    }

    return false;
  }

  static rehydrate(
    props: RequirementProps,
    id: string,
  ): Requirement {
    return new Requirement(props, id);
  }
}
