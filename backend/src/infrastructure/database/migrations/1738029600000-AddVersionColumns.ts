import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * 添加乐观锁版本号列
 *
 * 为关键聚合根表添加 version 列，用于并发控制
 */
export class AddVersionColumns1738029600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加 version 列到 conversations 表
    await queryRunner.addColumn(
      'conversations',
      new TableColumn({
        name: 'version',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );

    // 添加 version 列到 tasks 表
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'version',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );

    // 添加 version 列到 requirements 表
    await queryRunner.addColumn(
      'requirements',
      new TableColumn({
        name: 'version',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );

    // 添加 version 列到 customer_profiles 表
    await queryRunner.addColumn(
      'customer_profiles',
      new TableColumn({
        name: 'version',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );

    process.stdout.write('✅ Added version columns for optimistic locking\n');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('conversations', 'version');
    await queryRunner.dropColumn('tasks', 'version');
    await queryRunner.dropColumn('requirements', 'version');
    await queryRunner.dropColumn('customer_profiles', 'version');
  }
}
