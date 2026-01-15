import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOutboxEventsTable1705234800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建outbox_events表
    await queryRunner.createTable(
      new Table({
        name: 'outbox_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'aggregate_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'aggregate_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'event_data',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'version',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'max_retries',
            type: 'int',
            default: 3,
            isNullable: false,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'next_retry_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'published_at',
            type: 'timestamp',
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
            name: 'occurred_at',
            type: 'timestamp',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 创建索引
    await queryRunner.createIndex(
      'outbox_events',
      new TableIndex({
        name: 'IDX_outbox_events_status_created_at',
        columnNames: ['status', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'outbox_events',
      new TableIndex({
        name: 'IDX_outbox_events_aggregate_id',
        columnNames: ['aggregate_id'],
      }),
    );

    await queryRunner.createIndex(
      'outbox_events',
      new TableIndex({
        name: 'IDX_outbox_events_event_type',
        columnNames: ['event_type'],
      }),
    );

    await queryRunner.createIndex(
      'outbox_events',
      new TableIndex({
        name: 'IDX_outbox_events_next_retry_at',
        columnNames: ['next_retry_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除索引
    await queryRunner.dropIndex('outbox_events', 'IDX_outbox_events_next_retry_at');
    await queryRunner.dropIndex('outbox_events', 'IDX_outbox_events_event_type');
    await queryRunner.dropIndex('outbox_events', 'IDX_outbox_events_aggregate_id');
    await queryRunner.dropIndex('outbox_events', 'IDX_outbox_events_status_created_at');

    // 删除表
    await queryRunner.dropTable('outbox_events');
  }
}
