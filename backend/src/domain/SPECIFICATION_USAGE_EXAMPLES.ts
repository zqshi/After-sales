/**
 * Specification模式使用示例
 *
 * 演示如何使用Specification模式进行：
 * 1. Repository查询（避免接口爆炸）
 * 2. 内存过滤（规则复用）
 * 3. 业务规则验证（规则组合）
 */

import {
  OverdueTaskSpecification,
  HighPriorityTaskSpecification,
  PendingTaskSpecification,
  AssignedToSpecification as TaskAssignedToSpec,
  UrgentTaskSpecification,
  AgentWorklistSpecification as TaskWorklistSpec,
  RiskyTaskSpecification,
  BelongsToConversationSpecification,
  NeedsEscalationSpecification,
} from '@domain/task/specifications/TaskSpecifications';

import {
  UrgentRequirementSpecification,
  PendingRequirementSpecification,
  CustomerInitiatedSpecification,
  ShouldAutoCreateTaskSpecification,
  AgentWorklistSpecification as ReqWorklistSpec,
  RequiresImmediateAttentionSpecification,
  OpenBugSpecification,
  CategorySpecification,
} from '@domain/requirement/specifications/RequirementSpecifications';

import { ExpressionSpecification } from '@domain/shared/Specification';
import type { ITaskRepository } from '@domain/task/repositories/ITaskRepository';
import type { IRequirementRepository } from '@domain/requirement/repositories/IRequirementRepository';
import type { Task } from '@domain/task/models/Task';
import type { Requirement } from '@domain/requirement/models/Requirement';

/**
 * ============================================
 * 示例1: 避免Repository接口爆炸
 * ============================================
 *
 * ❌ 不使用Specification（接口爆炸）：
 * interface ITaskRepository {
 *   findOverdueTasks(): Promise<Task[]>;
 *   findHighPriorityTasks(): Promise<Task[]>;
 *   findOverdueAndHighPriorityTasks(): Promise<Task[]>;
 *   findPendingTasksByAgent(agentId: string): Promise<Task[]>;
 *   findOverdueTasksByAgent(agentId: string): Promise<Task[]>;
 *   // ... 无穷无尽的组合方法
 * }
 *
 * ✅ 使用Specification（单一方法）：
 * interface ITaskRepository {
 *   findBySpecification(spec: ISpecification<Task>): Promise<Task[]>;
 * }
 */

export async function example1_RepositoryQuery(
  taskRepository: ITaskRepository,
  agentId: string,
) {
  // 查询1: 所有超期任务
  const overdueTasks = await taskRepository.findBySpecification(
    new OverdueTaskSpecification(),
  );

  // 查询2: 所有高优先级任务
  const highPriorityTasks = await taskRepository.findBySpecification(
    new HighPriorityTaskSpecification(),
  );

  // 查询3: 组合查询 - 超期 AND 高优先级
  const urgentOverdueTasks = await taskRepository.findBySpecification(
    new OverdueTaskSpecification().and(new HighPriorityTaskSpecification()),
  );

  // 查询4: 组合查询 - (超期 OR 高优先级) AND 分配给我
  const myUrgentTasks = await taskRepository.findBySpecification(
    new OverdueTaskSpecification()
      .or(new HighPriorityTaskSpecification())
      .and(new TaskAssignedToSpec(agentId)),
  );

  // 查询5: 预定义的复杂规则 - 客服工作台待办
  const myWorklist = await taskRepository.findBySpecification(
    new TaskWorklistSpec(agentId),
  );

  // 查询6: 风险任务（需要升级 OR 超期）
  const riskyTasks = await taskRepository.findBySpecification(
    new RiskyTaskSpecification(),
  );

  return {
    overdueTasks,
    highPriorityTasks,
    urgentOverdueTasks,
    myUrgentTasks,
    myWorklist,
    riskyTasks,
  };
}

/**
 * ============================================
 * 示例2: 内存过滤（规则复用）
 * ============================================
 *
 * 场景：从已加载的实体列表中筛选，无需再次查询数据库
 */

export function example2_InMemoryFilter(
  tasks: Task[],
  conversationId: string,
) {
  // 过滤1: 从所有任务中筛选超期任务
  const overdueSpec = new OverdueTaskSpecification();
  const overdueTasks = tasks.filter((task) => overdueSpec.isSatisfiedBy(task));

  // 过滤2: 从所有任务中筛选属于某个对话的高优先级任务
  const conversationHighPrioritySpec = new BelongsToConversationSpecification(
    conversationId,
  ).and(new HighPriorityTaskSpecification());

  const conversationHighPriorityTasks = tasks.filter((task) =>
    conversationHighPrioritySpec.isSatisfiedBy(task),
  );

  // 过滤3: 筛选需要升级的待处理任务
  const needsEscalationAndPendingSpec = new NeedsEscalationSpecification().and(
    new PendingTaskSpecification(),
  );

  const tasksToEscalate = tasks.filter((task) =>
    needsEscalationAndPendingSpec.isSatisfiedBy(task),
  );

  return {
    overdueTasks,
    conversationHighPriorityTasks,
    tasksToEscalate,
  };
}

/**
 * ============================================
 * 示例3: 业务规则验证
 * ============================================
 *
 * 场景：在业务逻辑中验证实体是否满足特定条件
 */

export function example3_BusinessRuleValidation(
  requirement: Requirement,
  task: Task,
) {
  // 规则1: 检查需求是否应该自动创建任务
  const shouldAutoCreateSpec = new ShouldAutoCreateTaskSpecification();
  if (shouldAutoCreateSpec.isSatisfiedBy(requirement)) {
    console.log('该需求应该自动创建任务');
    // 执行自动创建任务逻辑
  }

  // 规则2: 检查需求是否需要立即关注
  const requiresAttentionSpec = new RequiresImmediateAttentionSpecification();
  if (requiresAttentionSpec.isSatisfiedBy(requirement)) {
    console.log('该需求需要立即关注！');
    // 发送告警通知
  }

  // 规则3: 检查任务是否需要升级
  const needsEscalationSpec = new NeedsEscalationSpecification();
  if (needsEscalationSpec.isSatisfiedBy(task)) {
    console.log('该任务需要升级！');
    // 触发升级流程
  }

  // 规则4: 复杂业务规则 - 紧急客户发起的待处理需求
  const urgentCustomerPendingSpec = new UrgentRequirementSpecification()
    .and(new CustomerInitiatedSpecification())
    .and(new PendingRequirementSpecification());

  if (urgentCustomerPendingSpec.isSatisfiedBy(requirement)) {
    console.log('紧急！客户发起的待处理需求，需要立即响应！');
    // 优先分配给最佳客服
  }
}

/**
 * ============================================
 * 示例4: Lambda表达式规格（动态规则）
 * ============================================
 *
 * 场景：使用ExpressionSpecification创建临时的、动态的规则
 */

export async function example4_ExpressionSpecification(
  taskRepository: ITaskRepository,
  minDuration: number,
) {
  // 动态规则1: 任务耗时超过指定分钟数
  const longRunningSpec = new ExpressionSpecification<Task>((task) => {
    return task.calculateDuration() > minDuration;
  });

  const longRunningTasks =
    await taskRepository.findBySpecification(longRunningSpec);

  // 动态规则2: 剩余时间少于30分钟的任务
  const almostDueSpec = new ExpressionSpecification<Task>((task) => {
    const remaining = task.calculateRemainingTime();
    return remaining !== null && remaining < 30;
  });

  const almostDueTasks =
    await taskRepository.findBySpecification(almostDueSpec);

  // 动态规则3: 组合静态规则和动态规则
  const urgentAndLongRunningSpec =
    new HighPriorityTaskSpecification().and(longRunningSpec);

  const urgentLongRunningTasks = await taskRepository.findBySpecification(
    urgentAndLongRunningSpec,
  );

  return {
    longRunningTasks,
    almostDueTasks,
    urgentLongRunningTasks,
  };
}

/**
 * ============================================
 * 示例5: 复杂查询组合
 * ============================================
 *
 * 场景：构建非常复杂的查询条件
 */

export async function example5_ComplexQuery(
  taskRepository: ITaskRepository,
  requirementRepository: IRequirementRepository,
  agentId: string,
) {
  // 复杂查询1: 客服的紧急工作列表
  // 规则：(超期 OR 高优先级) AND 分配给我 AND (待处理 OR 进行中)
  const urgentWorklistSpec = new OverdueTaskSpecification()
    .or(new HighPriorityTaskSpecification())
    .and(new TaskAssignedToSpec(agentId))
    .and(
      new PendingTaskSpecification().or(
        new ExpressionSpecification<Task>(
          (task) => task.status === 'in_progress',
        ),
      ),
    );

  const urgentWorklist =
    await taskRepository.findBySpecification(urgentWorklistSpec);

  // 复杂查询2: 需要关注的Bug类需求
  // 规则：Bug分类 AND 未关闭 AND (紧急 OR 客户发起)
  const criticalBugsSpec = new CategorySpecification('bug')
    .and(
      new ExpressionSpecification<Requirement>((req) => req.status !== 'closed'),
    )
    .and(
      new UrgentRequirementSpecification().or(
        new CustomerInitiatedSpecification(),
      ),
    );

  const criticalBugs =
    await requirementRepository.findBySpecification(criticalBugsSpec);

  // 复杂查询3: 使用NOT操作符
  // 规则：高优先级 AND NOT(已分配) → 待分配的高优需求
  const unassignedHighPrioritySpec = new ExpressionSpecification<Requirement>(
    (req) => req.priority.isHighPriority(),
  ).and(
    new ExpressionSpecification<Requirement>(
      (req) => !!req.assigneeId,
    ).not(),
  );

  const unassignedHighPriority = await requirementRepository.findBySpecification(
    unassignedHighPrioritySpec,
  );

  return {
    urgentWorklist,
    criticalBugs,
    unassignedHighPriority,
  };
}

/**
 * ============================================
 * 示例6: 实际业务场景应用
 * ============================================
 */

/**
 * 业务场景1: 自动分配任务
 *
 * 需求：每5分钟扫描未分配的紧急任务，自动分配给最佳客服
 */
export async function businessCase1_AutoAssignUrgentTasks(
  taskRepository: ITaskRepository,
) {
  // 查询：未分配 AND 紧急 AND 待处理
  const unassignedUrgentSpec = new ExpressionSpecification<Task>(
    (task) => !task.assigneeId,
  )
    .and(new UrgentTaskSpecification())
    .and(new PendingTaskSpecification());

  const tasksToAssign =
    await taskRepository.findBySpecification(unassignedUrgentSpec);

  console.log(`发现 ${tasksToAssign.length} 个待分配的紧急任务`);
  // 执行自动分配逻辑...
}

/**
 * 业务场景2: 风险监控告警
 *
 * 需求：每小时检查风险任务，发送告警通知
 */
export async function businessCase2_RiskMonitoring(
  taskRepository: ITaskRepository,
) {
  // 查询：风险任务（超期 OR 需要升级）AND 未完成
  const riskyTasksSpec = new RiskyTaskSpecification().and(
    new ExpressionSpecification<Task>(
      (task) => task.status !== 'completed' && task.status !== 'cancelled',
    ),
  );

  const riskyTasks = await taskRepository.findBySpecification(riskyTasksSpec);

  if (riskyTasks.length > 0) {
    console.log(`⚠️ 发现 ${riskyTasks.length} 个风险任务，需要关注！`);
    // 发送告警通知到管理员...
  }
}

/**
 * 业务场景3: 客户关怀自动化
 *
 * 需求：识别需要客户关怀的需求（客户发起 + 紧急 + 待处理）
 */
export async function businessCase3_CustomerCare(
  requirementRepository: IRequirementRepository,
) {
  // 查询：客户发起 AND 紧急 AND 待处理
  const needsCareSpec = new CustomerInitiatedSpecification()
    .and(new UrgentRequirementSpecification())
    .and(new PendingRequirementSpecification());

  const requirementsNeedingCare =
    await requirementRepository.findBySpecification(needsCareSpec);

  console.log(`发现 ${requirementsNeedingCare.length} 个需要客户关怀的需求`);
  // 自动发送关怀消息...
}

/**
 * 业务场景4: 质量报表生成
 *
 * 需求：统计本周的任务完成情况（按优先级分组）
 */
export async function businessCase4_WeeklyReport(
  taskRepository: ITaskRepository,
) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  // 查询1: 本周完成的高优任务
  const completedHighPrioritySpec = new ExpressionSpecification<Task>(
    (task) => task.status === 'completed' && task.completedAt! >= weekStart,
  ).and(new HighPriorityTaskSpecification());

  const completedHighPriority = await taskRepository.findBySpecification(
    completedHighPrioritySpec,
  );

  // 查询2: 本周完成的普通任务
  const completedNormalSpec = new ExpressionSpecification<Task>(
    (task) => task.status === 'completed' && task.completedAt! >= weekStart,
  ).and(new HighPriorityTaskSpecification().not());

  const completedNormal =
    await taskRepository.findBySpecification(completedNormalSpec);

  console.log('本周任务完成情况：');
  console.log(`  - 高优任务：${completedHighPriority.length} 个`);
  console.log(`  - 普通任务：${completedNormal.length} 个`);
}

/**
 * ============================================
 * 总结：Specification模式的核心价值
 * ============================================
 *
 * 1. 避免Repository接口爆炸
 *    - 不再需要为每种查询组合定义新方法
 *    - 单一的findBySpecification()方法即可
 *
 * 2. 规则复用和组合
 *    - 基础规则（如OverdueTaskSpecification）可复用
 *    - 通过and/or/not组合成复杂规则
 *
 * 3. 领域逻辑显式化
 *    - 查询规则成为显式的领域概念
 *    - 易于理解、测试、维护
 *
 * 4. 解耦查询和存储
 *    - Specification在Domain层（纯业务规则）
 *    - Repository将其转换为具体查询（SQL/NoSQL）
 *
 * 5. 支持内存过滤
 *    - 同一规则可用于数据库查询和内存过滤
 *    - tasks.filter(spec.isSatisfiedBy)
 *
 * 6. 可测试性
 *    - 规则可单独测试（不依赖数据库）
 *    - 组合规则也易于测试
 */
