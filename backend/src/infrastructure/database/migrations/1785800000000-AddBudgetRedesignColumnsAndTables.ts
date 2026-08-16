import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBudgetRedesignColumnsAndTables1785800000000 implements MigrationInterface {
  name = 'AddBudgetRedesignColumnsAndTables1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add columns for sub-rows and flow intention to budget_items
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD COLUMN IF NOT EXISTS "sub_row_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD COLUMN IF NOT EXISTS "sub_row_label" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD COLUMN IF NOT EXISTS "cash_flow_direction" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD COLUMN IF NOT EXISTS "flow_intention" character varying`,
    );

    // 2. Drop unique index on (budget_id, account_id) to allow sub-rows per account
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_d1e687cc9a96148c8471c4d4f0"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_budget_items_budget_id_account_id"`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_budget_items_budget_id_account_id" ON "budget_items" ("budget_id", "account_id")`,
    );

    // 3. Create budget_reassignments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "budget_reassignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "period_id" uuid NOT NULL,
        "source_account_id" uuid NOT NULL,
        "target_account_id" uuid NOT NULL,
        "amount" numeric(18,4) NOT NULL,
        "reason" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_budget_reassignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_budget_reassignments_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_budget_reassignments_period_id" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_budget_reassignments_source_account_id" FOREIGN KEY ("source_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_budget_reassignments_target_account_id" FOREIGN KEY ("target_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // 4. Create indexes for budget_reassignments
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_budget_reassignments_period_id" ON "budget_reassignments" ("period_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_budget_reassignments_source_account_id" ON "budget_reassignments" ("source_account_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_budget_reassignments_target_account_id" ON "budget_reassignments" ("target_account_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_budget_reassignments_user_id" ON "budget_reassignments" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "budget_reassignments"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_budget_items_budget_id_account_id"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d1e687cc9a96148c8471c4d4f0" ON "budget_items" ("budget_id", "account_id")`,
    );
    await queryRunner.query(`ALTER TABLE "budget_items" DROP COLUMN IF EXISTS "flow_intention"`);
    await queryRunner.query(
      `ALTER TABLE "budget_items" DROP COLUMN IF EXISTS "cash_flow_direction"`,
    );
    await queryRunner.query(`ALTER TABLE "budget_items" DROP COLUMN IF EXISTS "sub_row_label"`);
    await queryRunner.query(`ALTER TABLE "budget_items" DROP COLUMN IF EXISTS "sub_row_id"`);
  }
}
