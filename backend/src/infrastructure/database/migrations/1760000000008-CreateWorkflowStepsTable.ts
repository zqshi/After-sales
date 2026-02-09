import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWorkflowStepsTable1760000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'workflow_steps',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'execution_id', type: 'varchar', length: '80', isNullable: false },
          { name: 'step_name', type: 'varchar', length: '120', isNullable: false },
          { name: 'step_type', type: 'varchar', length: '50', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', isNullable: false },
          { name: 'input', type: 'jsonb', isNullable: false, default: "'{}'" },
          { name: 'output', type: 'jsonb', isNullable: false, default: "'{}'" },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'started_at', type: 'timestamp', isNullable: true },
          { name: 'completed_at', type: 'timestamp', isNullable: true },
          { name: 'duration_ms', type: 'int', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'workflow_steps',
      new TableIndex({
        name: 'IDX_workflow_steps_execution_id',
        columnNames: ['execution_id'],
      }),
    );
    await queryRunner.createIndex(
      'workflow_steps',
      new TableIndex({
        name: 'IDX_workflow_steps_step_name',
        columnNames: ['step_name'],
      }),
    );
    await queryRunner.createIndex(
      'workflow_steps',
      new TableIndex({
        name: 'IDX_workflow_steps_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('workflow_steps', 'IDX_workflow_steps_status');
    await queryRunner.dropIndex('workflow_steps', 'IDX_workflow_steps_step_name');
    await queryRunner.dropIndex('workflow_steps', 'IDX_workflow_steps_execution_id');
    await queryRunner.dropTable('workflow_steps');
  }
}
