import type { ISpecification } from '@domain/shared/Specification';

import { Requirement } from '../models/Requirement';

export interface RequirementPagination {
  limit: number;
  offset: number;
}

export interface IRequirementRepository {
  findById(id: string): Promise<Requirement | null>;
  findByFilters(filters: RequirementQueryFilters, pagination?: RequirementPagination): Promise<Requirement[]>;
  countByFilters(filters: RequirementQueryFilters): Promise<number>;
  save(requirement: Requirement): Promise<void>;
  delete(id: string): Promise<void>;

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
   * // 查询紧急且客户发起的待处理需求
   * const requirements = await requirementRepository.findBySpecification(
   *   new UrgentRequirementSpecification()
   *     .and(new CustomerInitiatedSpecification())
   *     .and(new PendingRequirementSpecification())
   * );
   * ```
   *
   * @param specification - 查询规格
   * @param pagination - 分页参数（可选）
   * @returns 满足规格的Requirement列表
   */
  findBySpecification(
    specification: ISpecification<Requirement>,
    pagination?: RequirementPagination,
  ): Promise<Requirement[]>;
}

export interface RequirementQueryFilters {
  customerId?: string;
  conversationId?: string;
  status?: string;
  category?: string;
  priority?: string;
}
