import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateExternalIdentitiesTable1760000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'external_identities',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'customer_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'channel', type: 'varchar', length: '20', isNullable: false },
          { name: 'external_type', type: 'varchar', length: '10', isNullable: false },
          { name: 'external_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'metadata', type: 'jsonb', isNullable: false, default: "'{}'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'external_identities',
      new TableIndex({
        name: 'IDX_external_identities_customer_id',
        columnNames: ['customer_id'],
      }),
    );

    await queryRunner.createIndex(
      'external_identities',
      new TableIndex({
        name: 'UQ_external_identities_external',
        columnNames: ['channel', 'external_type', 'external_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('external_identities', 'UQ_external_identities_external');
    await queryRunner.dropIndex('external_identities', 'IDX_external_identities_customer_id');
    await queryRunner.dropTable('external_identities');
  }
}
