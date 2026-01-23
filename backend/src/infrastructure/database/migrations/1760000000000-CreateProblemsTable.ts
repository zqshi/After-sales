import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProblemsTable1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'problems',
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
            name: 'customer_id',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'intent',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'confidence',
            type: 'float',
            isNullable: true,
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
          {
            name: 'resolved_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'problems',
      new TableIndex({
        name: 'IDX_problems_conversation_id',
        columnNames: ['conversation_id'],
      }),
    );

    await queryRunner.createIndex(
      'problems',
      new TableIndex({
        name: 'IDX_problems_customer_id',
        columnNames: ['customer_id'],
      }),
    );

    await queryRunner.createIndex(
      'problems',
      new TableIndex({
        name: 'IDX_problems_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('problems', 'IDX_problems_status');
    await queryRunner.dropIndex('problems', 'IDX_problems_customer_id');
    await queryRunner.dropIndex('problems', 'IDX_problems_conversation_id');
    await queryRunner.dropTable('problems');
  }
}
