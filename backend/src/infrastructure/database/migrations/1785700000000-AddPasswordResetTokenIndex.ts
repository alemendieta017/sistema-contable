import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetTokenIndex1785700000000 implements MigrationInterface {
  name = 'AddPasswordResetTokenIndex1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_tokens_token_hash" ON "password_reset_tokens" ("token_hash")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_tokens_token_hash"`);
  }
}
