import type { ISpecification } from '@domain/shared/Specification';

import { Task } from '../models/Task';

export interface TaskFilters {
  assigneeId?: string;
  conversationId?: string;
  requirementId?: string;
  type?: string;
  status?: string;
  priority?: string;
}

export interface TaskPagination {
  limit: number;
  offset: number;
}

export interface ITaskRepository {
  save(task: Task): Promise<void>;
  findById(id: string): Promise<Task | null>;
  findByFilters(filters: TaskFilters, pagination?: TaskPagination): Promise<Task[]>;
  countByFilters(filters: TaskFilters): Promise<number>;

  /**
   * 便捷方法：根据conversationId查找所有Task
   * 用于跨域事件协调（Task完成时检查Conversation状态）
   */
  findByConversationId(conversationId: string): Promise<Task[]>;

  /**
   * Specification模式查询
   *
   * 核心价值：
   * - 避免接口爆炸（不再需要为每种查询组合定义新方法）
   * - 规则可复用、可组合、可测试
   * - 领域逻辑显式化
   *
   * 使用示例：
   * ```typescript
   * // 查询超期且高优先级的任务
   * const tasks = await taskRepository.findBySpecification(
   *   new OverdueTaskSpecification().and(new HighPriorityTaskSpecification())
   * );
   * ```
   *
   * @param specification - 查询规格
   * @param pagination - 分页参数（可选）
   * @returns 满足规格的Task列表
   */
  findBySpecification(
    specification: ISpecification<Task>,
    pagination?: TaskPagination,
  ): Promise<Task[]>;
}
