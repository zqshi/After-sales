/**
 * Specification模式 - 规格模式
 *
 * 职责：
 * 1. 封装业务查询规则，避免仓储接口爆炸
 * 2. 支持规则组合（And、Or、Not）
 * 3. 表达式可重用、可测试、可组合
 *
 * 核心价值：
 * - 避免仓储接口方法爆炸（findByStatus、findByPriority、findByStatusAndPriority...）
 * - 业务查询规则显式化、可重用
 * - 支持复杂查询条件的组合
 *
 * 使用场景：
 * - Repository.findBySpecification(spec)
 * - 列表过滤：tasks.filter(spec.isSatisfiedBy)
 * - 业务规则验证：spec.isSatisfiedBy(entity)
 */

/**
 * Specification基础接口
 */
export interface ISpecification<T> {
  /**
   * 判断实体是否满足规格
   */
  isSatisfiedBy(entity: T): boolean;

  /**
   * 与操作
   */
  and(other: ISpecification<T>): ISpecification<T>;

  /**
   * 或操作
   */
  or(other: ISpecification<T>): ISpecification<T>;

  /**
   * 非操作
   */
  not(): ISpecification<T>;
}

/**
 * Specification抽象基类
 */
export abstract class Specification<T> implements ISpecification<T> {
  abstract isSatisfiedBy(entity: T): boolean;

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification<T>(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification<T>(this, other);
  }

  not(): ISpecification<T> {
    return new NotSpecification<T>(this);
  }
}

/**
 * And组合规则
 */
export class AndSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return (
      this.left.isSatisfiedBy(entity) && this.right.isSatisfiedBy(entity)
    );
  }
}

/**
 * Or组合规则
 */
export class OrSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return (
      this.left.isSatisfiedBy(entity) || this.right.isSatisfiedBy(entity)
    );
  }
}

/**
 * Not组合规则
 */
export class NotSpecification<T> extends Specification<T> {
  constructor(private readonly spec: ISpecification<T>) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return !this.spec.isSatisfiedBy(entity);
  }
}

/**
 * 通用表达式规则（lambda表达式）
 */
export class ExpressionSpecification<T> extends Specification<T> {
  constructor(private readonly expression: (entity: T) => boolean) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return this.expression(entity);
  }
}
