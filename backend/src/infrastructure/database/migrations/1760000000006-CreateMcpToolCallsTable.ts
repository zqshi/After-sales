import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMcpToolCallsTable1760000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'mcp_tool_calls',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'tool_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'conversation_id', type: 'uuid', isNullable: true },
          { name: 'customer_id', type: 'varchar', length: '50', isNullable: true },
          { name: 'agent_name', type: 'varchar', length: '100', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', isNullable: false },
          { name: 'duration_ms', type: 'int', isNullable: true },
          { name: 'args', type: 'jsonb', isNullable: false, default: "'{}'" },
          { name: 'result', type: 'jsonb', isNullable: false, default: "'{}'" },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'mcp_tool_calls',
      new TableIndex({
        name: 'IDX_mcp_tool_calls_tool_name',
        columnNames: ['tool_name'],
      }),
    );
    await queryRunner.createIndex(
      'mcp_tool_calls',
      new TableIndex({
        name: 'IDX_mcp_tool_calls_conversation_id',
        columnNames: ['conversation_id'],
      }),
    );
    await queryRunner.createIndex(
      'mcp_tool_calls',
      new TableIndex({
        name: 'IDX_mcp_tool_calls_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('mcp_tool_calls', 'IDX_mcp_tool_calls_created_at');
    await queryRunner.dropIndex('mcp_tool_calls', 'IDX_mcp_tool_calls_conversation_id');
    await queryRunner.dropIndex('mcp_tool_calls', 'IDX_mcp_tool_calls_tool_name');
    await queryRunner.dropTable('mcp_tool_calls');
  }
}
