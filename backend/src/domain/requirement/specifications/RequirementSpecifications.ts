import { Specification } from '@domain/shared/Specification';

import { Requirement } from '../models/Requirement';

/**
 * Requirement域的Specification实现集合
 *
 * 职责：
 * 1. 封装Requirement的各种查询规则
 * 2. 避免Repository接口爆炸
 * 3. 支持规则组合和复用
 *
 * 使用场景：
 * - Repository.findBySpecification(spec)
 * - 内存过滤：requirements.filter(spec.isSatisfiedBy)
 * - 业务规则验证：spec.isSatisfiedBy(requirement)
 */

/**
 * 紧急需求规格
 *
 * 规则：优先级为urgent
 */
export class UrgentRequirementSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.priority.isUrgent();
  }
}

/**
 * 高优先级需求规格
 *
 * 规则：优先级为high或urgent
 */
export class HighPriorityRequirementSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.priority.isHighPriority();
  }
}

/**
 * 低优先级需求规格
 *
 * 规则：优先级为low
 */
export class LowPriorityRequirementSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.priority.isLowPriority();
  }
}

/**
 * 待处理需求规格
 *
 * 规则：状态为pending
 */
export class PendingRequirementSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.status === 'pending';
  }
}

/**
 * 处理中需求规格
 *
 * 规则：状态为in_progress
 */
export class InProgressRequirementSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.status === 'in_progress';
  }
}

/**
 * 已解决需求规格
 *
 * 规则：状态为resolved
 */
export class ResolvedRequirementSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.status === 'resolved';
  }
}

/**
 * 已关闭需求规格
 *
 * 规则：状态为closed
 */
export class ClosedRequirementSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.status === 'closed';
  }
}

/**
 * 客户发起的需求规格
 *
 * 规则：source为customer或conversation
 */
export class CustomerInitiatedSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.source.isCustomerInitiated();
  }
}

/**
 * 手动创建的需求规格
 *
 * 规则：source为manual
 */
export class ManuallyCreatedSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.source.isManual();
  }
}

/**
 * 来自对话的需求规格
 *
 * 规则：source为conversation
 */
export class FromConversationSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.source.isFromConversation();
  }
}

/**
 * 应自动创建任务的需求规格
 *
 * 规则：
 * - 优先级为urgent或high OR
 * - 来源为customer或conversation
 */
export class ShouldAutoCreateTaskSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.shouldAutoCreateTask();
  }
}

/**
 * 需要客户沟通的需求规格
 *
 * 规则：
 * - 无关联对话 AND
 * - (优先级urgent OR 分类为technical/feature/bug)
 */
export class NeedsCustomerCommunicationSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.needsCustomerCommunication();
  }
}

/**
 * 属于指定对话的需求规格
 *
 * 规则：conversationId匹配
 */
export class BelongsToConversationSpecification extends Specification<Requirement> {
  constructor(private readonly conversationId: string) {
    super();
  }

  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.conversationId === this.conversationId;
  }
}

/**
 * 未分配的需求规格
 *
 * 规则：assigneeId为空
 */
export class UnassignedRequirementSpecification extends Specification<Requirement> {
  isSatisfiedBy(requirement: Requirement): boolean {
    return !requirement.assigneeId;
  }
}

/**
 * 分配给指定客服的需求规格
 *
 * 规则：assigneeId匹配
 */
export class AssignedToSpecification extends Specification<Requirement> {
  constructor(private readonly agentId: string) {
    super();
  }

  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.assigneeId === this.agentId;
  }
}

/**
 * 指定分类的需求规格
 *
 * 规则：category匹配
 */
export class CategorySpecification extends Specification<Requirement> {
  constructor(private readonly category: string) {
    super();
  }

  isSatisfiedBy(requirement: Requirement): boolean {
    return requirement.category === this.category;
  }
}

/**
 * 指定时间范围内创建的需求规格
 *
 * 规则：createdAt在startDate和endDate之间
 */
export class CreatedBetweenSpecification extends Specification<Requirement> {
  constructor(
    private readonly startDate: Date,
    private readonly endDate: Date,
  ) {
    super();
  }

  isSatisfiedBy(requirement: Requirement): boolean {
    const createdAt = requirement.createdAt;
    return createdAt >= this.startDate && createdAt <= this.endDate;
  }
}

/**
 * 紧急待办需求规格（常用组合规则）
 *
 * 规则：紧急优先级 AND 待处理 AND 未分配
 */
export class UrgentTodoSpecification extends Specification<Requirement> {
  private readonly spec: Specification<Requirement>;

  constructor() {
    super();
    this.spec = new UrgentRequirementSpecification()
      .and(new PendingRequirementSpecification())
      .and(new UnassignedRequirementSpecification());
  }

  isSatisfiedBy(requirement: Requirement): boolean {
    return this.spec.isSatisfiedBy(requirement);
  }
}

/**
 * 客服工作台待办需求规格（常用组合规则）
 *
 * 规则：(待处理 OR 处理中) AND 分配给我 AND 未关闭
 */
export class AgentWorklistSpecification extends Specification<Requirement> {
  private readonly spec: Specification<Requirement>;

  constructor(agentId: string) {
    super();
    this.spec = new PendingRequirementSpecification()
      .or(new InProgressRequirementSpecification())
      .and(new AssignedToSpecification(agentId))
      .and(new ClosedRequirementSpecification().not());
  }

  isSatisfiedBy(requirement: Requirement): boolean {
    return this.spec.isSatisfiedBy(requirement);
  }
}

/**
 * 需要立即关注的需求规格（常用组合规则）
 *
 * 规则：
 * (紧急优先级 OR 需要客户沟通) AND 未关闭
 */
export class RequiresImmediateAttentionSpecification extends Specification<Requirement> {
  private readonly spec: Specification<Requirement>;

  constructor() {
    super();
    this.spec = new UrgentRequirementSpecification()
      .or(new NeedsCustomerCommunicationSpecification())
      .and(new ClosedRequirementSpecification().not());
  }

  isSatisfiedBy(requirement: Requirement): boolean {
    return this.spec.isSatisfiedBy(requirement);
  }
}

/**
 * Bug类需求规格（常用组合规则）
 *
 * 规则：分类为bug AND 未关闭
 */
export class OpenBugSpecification extends Specification<Requirement> {
  private readonly spec: Specification<Requirement>;

  constructor() {
    super();
    this.spec = new CategorySpecification('bug').and(
      new ClosedRequirementSpecification().not(),
    );
  }

  isSatisfiedBy(requirement: Requirement): boolean {
    return this.spec.isSatisfiedBy(requirement);
  }
}
