import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateQualityReportsTable1760000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'quality_reports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'conversation_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'problem_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'quality_score',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'report',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'quality_reports',
      new TableIndex({
        name: 'IDX_quality_reports_conversation_id',
        columnNames: ['conversation_id'],
      }),
    );

    await queryRunner.createIndex(
      'quality_reports',
      new TableIndex({
        name: 'IDX_quality_reports_problem_id',
        columnNames: ['problem_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('quality_reports', 'IDX_quality_reports_problem_id');
    await queryRunner.dropIndex('quality_reports', 'IDX_quality_reports_conversation_id');
    await queryRunner.dropTable('quality_reports');
  }
}
