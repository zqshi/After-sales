import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPermissionsManagementPermissions1760000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE roles
      SET permissions = (
        SELECT jsonb_agg(DISTINCT value)
        FROM jsonb_array_elements_text(
          permissions || '["permissions.members.manage","permissions.roles.manage"]'::jsonb
        ) AS value
      )
      WHERE key = 'admin';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE roles
      SET permissions = (
        SELECT jsonb_agg(value)
        FROM jsonb_array_elements_text(permissions) AS value
        WHERE value NOT IN ('permissions.members.manage', 'permissions.roles.manage')
      )
      WHERE key = 'admin';
    `);
  }
}
