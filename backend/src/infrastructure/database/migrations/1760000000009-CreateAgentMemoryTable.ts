import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAgentMemoryTable1760000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'agent_memory',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'conversation_id', type: 'uuid', isNullable: false },
          { name: 'agent_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'memory', type: 'jsonb', isNullable: false, default: "'{}'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'agent_memory',
      new TableIndex({
        name: 'IDX_agent_memory_conversation_agent',
        columnNames: ['conversation_id', 'agent_name'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('agent_memory', 'IDX_agent_memory_conversation_agent');
    await queryRunner.dropTable('agent_memory');
  }
}
