import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateReviewRequestsTable1760000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'review_requests',
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
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'suggestion',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'confidence',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'reviewer_id',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'reviewer_note',
            type: 'text',
            isNullable: true,
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
      'review_requests',
      new TableIndex({
        name: 'IDX_review_requests_conversation_id',
        columnNames: ['conversation_id'],
      }),
    );

    await queryRunner.createIndex(
      'review_requests',
      new TableIndex({
        name: 'IDX_review_requests_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('review_requests', 'IDX_review_requests_status');
    await queryRunner.dropIndex('review_requests', 'IDX_review_requests_conversation_id');
    await queryRunner.dropTable('review_requests');
  }
}
