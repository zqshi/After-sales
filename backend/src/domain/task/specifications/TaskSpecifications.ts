import { Specification } from '@domain/shared/Specification';

import { Task } from '../models/Task';

/**
 * Task域的Specification实现集合
 *
 * 职责：
 * 1. 封装Task的各种查询规则
 * 2. 避免Repository接口爆炸（findByStatus、findByPriority、findOverdue...）
 * 3. 支持规则组合和复用
 *
 * 使用场景：
 * - Repository.findBySpecification(spec)
 * - 内存过滤：tasks.filter(spec.isSatisfiedBy)
 * - 业务规则验证：spec.isSatisfiedBy(task)
 */

/**
 * 超期任务规格
 *
 * 规则：
 * - 有截止日期
 * - 当前时间 > 截止日期
 * - 状态不是completed或cancelled
 */
export class OverdueTaskSpecification extends Specification<Task> {
  isSatisfiedBy(task: Task): boolean {
    return task.isOverdue();
  }
}

/**
 * 高优先级任务规格
 *
 * 规则：优先级为high或urgent
 */
export class HighPriorityTaskSpecification extends Specification<Task> {
  isSatisfiedBy(task: Task): boolean {
    return task.isHighPriority();
  }
}

/**
 * 待处理任务规格
 *
 * 规则：状态为pending
 */
export class PendingTaskSpecification extends Specification<Task> {
  isSatisfiedBy(task: Task): boolean {
    return task.status === 'pending';
  }
}

/**
 * 进行中任务规格
 *
 * 规则：状态为in_progress
 */
export class InProgressTaskSpecification extends Specification<Task> {
  isSatisfiedBy(task: Task): boolean {
    return task.status === 'in_progress';
  }
}

/**
 * 已完成任务规格
 *
 * 规则：状态为completed
 */
export class CompletedTaskSpecification extends Specification<Task> {
  isSatisfiedBy(task: Task): boolean {
    return task.status === 'completed';
  }
}

/**
 * 分配给指定客服的任务规格
 *
 * 规则：assigneeId匹配
 */
export class AssignedToSpecification extends Specification<Task> {
  constructor(private readonly agentId: string) {
    super();
  }

  isSatisfiedBy(task: Task): boolean {
    return task.assigneeId === this.agentId;
  }
}

/**
 * 未分配任务规格
 *
 * 规则：assigneeId为空
 */
export class UnassignedTaskSpecification extends Specification<Task> {
  isSatisfiedBy(task: Task): boolean {
    return !task.assigneeId;
  }
}

/**
 * 属于指定对话的任务规格
 *
 * 规则：conversationId匹配
 */
export class BelongsToConversationSpecification extends Specification<Task> {
  constructor(private readonly conversationId: string) {
    super();
  }

  isSatisfiedBy(task: Task): boolean {
    return task.belongsToConversation(this.conversationId);
  }
}

/**
 * 关联指定需求的任务规格
 *
 * 规则：requirementId匹配
 */
export class LinkedToRequirementSpecification extends Specification<Task> {
  constructor(private readonly requirementId: string) {
    super();
  }

  isSatisfiedBy(task: Task): boolean {
    return task.isLinkedToRequirement(this.requirementId);
  }
}

/**
 * 需要升级的任务规格
 *
 * 规则：
 * - 已超期 OR
 * - in_progress超过2小时 OR
 * - pending超过1小时
 */
export class NeedsEscalationSpecification extends Specification<Task> {
  isSatisfiedBy(task: Task): boolean {
    return task.needsEscalation();
  }
}

/**
 * 可重新分配的任务规格
 *
 * 规则：状态为pending或in_progress
 */
export class CanReassignSpecification extends Specification<Task> {
  isSatisfiedBy(task: Task): boolean {
    return task.canReassign();
  }
}

/**
 * 指定时间范围内创建的任务规格
 *
 * 规则：createdAt在startDate和endDate之间
 */
export class CreatedBetweenSpecification extends Specification<Task> {
  constructor(
    private readonly startDate: Date,
    private readonly endDate: Date,
  ) {
    super();
  }

  isSatisfiedBy(task: Task): boolean {
    const createdAt = task.createdAt;
    return createdAt >= this.startDate && createdAt <= this.endDate;
  }
}

/**
 * 紧急任务规格（常用组合规则）
 *
 * 规则：高优先级 AND 待处理
 */
export class UrgentTaskSpecification extends Specification<Task> {
  private readonly spec: Specification<Task>;

  constructor() {
    super();
    this.spec = new HighPriorityTaskSpecification().and(
      new PendingTaskSpecification(),
    );
  }

  isSatisfiedBy(task: Task): boolean {
    return this.spec.isSatisfiedBy(task);
  }
}

/**
 * 客服工作台待办任务规格（常用组合规则）
 *
 * 规则：(待处理 OR 进行中) AND 分配给我 AND 未完成
 */
export class AgentWorklistSpecification extends Specification<Task> {
  private readonly spec: Specification<Task>;

  constructor(agentId: string) {
    super();
    this.spec = new PendingTaskSpecification()
      .or(new InProgressTaskSpecification())
      .and(new AssignedToSpecification(agentId))
      .and(new CompletedTaskSpecification().not());
  }

  isSatisfiedBy(task: Task): boolean {
    return this.spec.isSatisfiedBy(task);
  }
}

/**
 * 风险任务规格（常用组合规则）
 *
 * 规则：需要升级 OR 超期
 */
export class RiskyTaskSpecification extends Specification<Task> {
  private readonly spec: Specification<Task>;

  constructor() {
    super();
    this.spec = new NeedsEscalationSpecification().or(
      new OverdueTaskSpecification(),
    );
  }

  isSatisfiedBy(task: Task): boolean {
    return this.spec.isSatisfiedBy(task);
  }
}
