import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWorkflowRunsTable1760000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'workflow_runs',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'execution_id', type: 'varchar', length: '80', isNullable: false },
          { name: 'workflow_name', type: 'varchar', length: '120', isNullable: false },
          { name: 'status', type: 'varchar', length: '20', isNullable: false },
          { name: 'conversation_id', type: 'uuid', isNullable: true },
          { name: 'trigger', type: 'jsonb', isNullable: false, default: "'{}'" },
          { name: 'result', type: 'jsonb', isNullable: false, default: "'{}'" },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'started_at', type: 'timestamp', isNullable: true },
          { name: 'completed_at', type: 'timestamp', isNullable: true },
          { name: 'duration_ms', type: 'int', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'workflow_runs',
      new TableIndex({
        name: 'IDX_workflow_runs_execution_id',
        columnNames: ['execution_id'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'workflow_runs',
      new TableIndex({
        name: 'IDX_workflow_runs_workflow_name',
        columnNames: ['workflow_name'],
      }),
    );
    await queryRunner.createIndex(
      'workflow_runs',
      new TableIndex({
        name: 'IDX_workflow_runs_conversation_id',
        columnNames: ['conversation_id'],
      }),
    );
    await queryRunner.createIndex(
      'workflow_runs',
      new TableIndex({
        name: 'IDX_workflow_runs_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('workflow_runs', 'IDX_workflow_runs_status');
    await queryRunner.dropIndex('workflow_runs', 'IDX_workflow_runs_conversation_id');
    await queryRunner.dropIndex('workflow_runs', 'IDX_workflow_runs_workflow_name');
    await queryRunner.dropIndex('workflow_runs', 'IDX_workflow_runs_execution_id');
    await queryRunner.dropTable('workflow_runs');
  }
}
