import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAgentCallsTable1760000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'agent_calls',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'conversation_id', type: 'uuid', isNullable: true },
          { name: 'agent_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'agent_role', type: 'varchar', length: '50', isNullable: true },
          { name: 'mode', type: 'varchar', length: '50', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', isNullable: false },
          { name: 'duration_ms', type: 'int', isNullable: true },
          { name: 'started_at', type: 'timestamp', isNullable: true },
          { name: 'completed_at', type: 'timestamp', isNullable: true },
          { name: 'input', type: 'jsonb', isNullable: false, default: "'{}'" },
          { name: 'output', type: 'jsonb', isNullable: false, default: "'{}'" },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: false, default: "'{}'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'agent_calls',
      new TableIndex({
        name: 'IDX_agent_calls_conversation_id',
        columnNames: ['conversation_id'],
      }),
    );
    await queryRunner.createIndex(
      'agent_calls',
      new TableIndex({
        name: 'IDX_agent_calls_agent_name',
        columnNames: ['agent_name'],
      }),
    );
    await queryRunner.createIndex(
      'agent_calls',
      new TableIndex({
        name: 'IDX_agent_calls_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'agent_calls',
      new TableIndex({
        name: 'IDX_agent_calls_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('agent_calls', 'IDX_agent_calls_created_at');
    await queryRunner.dropIndex('agent_calls', 'IDX_agent_calls_status');
    await queryRunner.dropIndex('agent_calls', 'IDX_agent_calls_agent_name');
    await queryRunner.dropIndex('agent_calls', 'IDX_agent_calls_conversation_id');
    await queryRunner.dropTable('agent_calls');
  }
}
