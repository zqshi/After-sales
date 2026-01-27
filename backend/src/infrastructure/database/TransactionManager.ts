import { DataSource, EntityManager, QueryRunner } from 'typeorm';

/**
 * 事务管理器
 *
 * 提供统一的事务管理接口，确保聚合根保存和事件发布的原子性
 */
export class TransactionManager {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 在事务中执行操作
   *
   * @param work 要执行的工作函数
   * @returns 工作函数的返回值
   */
  async runInTransaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await work(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 在事务中执行操作（带隔离级别）
   *
   * @param isolationLevel 事务隔离级别
   * @param work 要执行的工作函数
   * @returns 工作函数的返回值
   */
  async runInTransactionWithIsolation<T>(
    isolationLevel: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE',
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction(isolationLevel);

    try {
      const result = await work(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
