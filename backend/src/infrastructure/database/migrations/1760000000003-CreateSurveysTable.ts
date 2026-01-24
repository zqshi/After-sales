import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSurveysTable1760000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'surveys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'customer_id',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'conversation_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'questions',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'responses',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'metadata',
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
      'surveys',
      new TableIndex({
        name: 'IDX_surveys_customer_id',
        columnNames: ['customer_id'],
      }),
    );

    await queryRunner.createIndex(
      'surveys',
      new TableIndex({
        name: 'IDX_surveys_conversation_id',
        columnNames: ['conversation_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('surveys', 'IDX_surveys_conversation_id');
    await queryRunner.dropIndex('surveys', 'IDX_surveys_customer_id');
    await queryRunner.dropTable('surveys');
  }
}
