import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaUpdate1785687814191 implements MigrationInterface {
  name = 'SchemaUpdate1785687814191';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT "FK_accounts_user_id"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT "FK_accounts_parent_id"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT "FK_accounts_currency_id"`);
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP CONSTRAINT "FK_journal_entries_transaction_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP CONSTRAINT "FK_journal_entries_account_id"`,
    );
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_user_id"`);
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_reversal_of_id"`,
    );
    await queryRunner.query(`ALTER TABLE "fiscal_years" DROP CONSTRAINT "FK_fiscal_years_user_id"`);
    await queryRunner.query(
      `ALTER TABLE "account_period_balances" DROP CONSTRAINT "FK_account_period_balances_account_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_period_balances" DROP CONSTRAINT "FK_account_period_balances_period_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" DROP CONSTRAINT "FK_budget_items_budget_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" DROP CONSTRAINT "FK_budget_items_account_id"`,
    );
    await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_budgets_user_id"`);
    await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_budgets_period_id"`);
    await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_budgets_account_id"`);
    await queryRunner.query(`ALTER TABLE "periods" DROP CONSTRAINT "FK_periods_fiscal_year_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_accounts_user_id_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fiscal_years_user_id_name"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_account_period_balances_account_id_period_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_budget_items_budget_id_account_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_periods_fiscal_year_id_name"`);
    await queryRunner.query(
      `CREATE TABLE "password_reset_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "full_name" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "is_active" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b5b3b2f82aa6da1a5104cf3835" ON "accounts" ("user_id", "name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_07eaff68656ffc520fb545e677" ON "fiscal_years" ("user_id", "name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e4849331009f150d893eb4e104" ON "account_period_balances" ("account_id", "period_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d1e687cc9a96148c8471c4d4f0" ON "budget_items" ("budget_id", "account_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b259b2ccd41b1b61d7fe5bcf0f" ON "periods" ("fiscal_year_id", "name") `,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "FK_3000dad1da61b29953f07476324" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "FK_f7ea327e4100ce4d6002ecdd12b" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "FK_2b0d7a85ef19e9882a0e6587d8c" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD CONSTRAINT "FK_31ceb294f983ff5f84bd9c6ed83" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD CONSTRAINT "FK_438fc3438d595f48c994b4a4894" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_4d9163fa78ab6cc18ea6d688771" FOREIGN KEY ("reversal_of_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "fiscal_years" ADD CONSTRAINT "FK_092ae48373d555b8d0e691d07d0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_period_balances" ADD CONSTRAINT "FK_53fb7f0f4e92a3a750c7a8b289f" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_period_balances" ADD CONSTRAINT "FK_673743baa65ae93c8cadd7f6f32" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD CONSTRAINT "FK_c3baf040ebaa2c35a6f5e0fe4d9" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD CONSTRAINT "FK_da47a972743160dd15e6ccb5dc6" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD CONSTRAINT "FK_5d25d8bbd6c209261dfe04558f1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD CONSTRAINT "FK_13cac50fe579ec6d6db68f60e73" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD CONSTRAINT "FK_08e12ed853dff5bbc38849cf7f4" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "periods" ADD CONSTRAINT "FK_f8db0265716568b71f3861729f0" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "periods" DROP CONSTRAINT "FK_f8db0265716568b71f3861729f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" DROP CONSTRAINT "FK_08e12ed853dff5bbc38849cf7f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" DROP CONSTRAINT "FK_13cac50fe579ec6d6db68f60e73"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" DROP CONSTRAINT "FK_5d25d8bbd6c209261dfe04558f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" DROP CONSTRAINT "FK_da47a972743160dd15e6ccb5dc6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" DROP CONSTRAINT "FK_c3baf040ebaa2c35a6f5e0fe4d9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_period_balances" DROP CONSTRAINT "FK_673743baa65ae93c8cadd7f6f32"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_period_balances" DROP CONSTRAINT "FK_53fb7f0f4e92a3a750c7a8b289f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fiscal_years" DROP CONSTRAINT "FK_092ae48373d555b8d0e691d07d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_4d9163fa78ab6cc18ea6d688771"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP CONSTRAINT "FK_438fc3438d595f48c994b4a4894"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP CONSTRAINT "FK_31ceb294f983ff5f84bd9c6ed83"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT "FK_2b0d7a85ef19e9882a0e6587d8c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT "FK_f7ea327e4100ce4d6002ecdd12b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT "FK_3000dad1da61b29953f07476324"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_b259b2ccd41b1b61d7fe5bcf0f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d1e687cc9a96148c8471c4d4f0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e4849331009f150d893eb4e104"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_07eaff68656ffc520fb545e677"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b5b3b2f82aa6da1a5104cf3835"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_active"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "full_name"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_periods_fiscal_year_id_name" ON "periods" ("fiscal_year_id", "name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_budget_items_budget_id_account_id" ON "budget_items" ("budget_id", "account_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_account_period_balances_account_id_period_id" ON "account_period_balances" ("account_id", "period_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fiscal_years_user_id_name" ON "fiscal_years" ("user_id", "name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_accounts_user_id_name" ON "accounts" ("user_id", "name") `,
    );
    await queryRunner.query(
      `ALTER TABLE "periods" ADD CONSTRAINT "FK_periods_fiscal_year_id" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD CONSTRAINT "FK_budgets_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD CONSTRAINT "FK_budgets_period_id" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD CONSTRAINT "FK_budgets_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD CONSTRAINT "FK_budget_items_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD CONSTRAINT "FK_budget_items_budget_id" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_period_balances" ADD CONSTRAINT "FK_account_period_balances_period_id" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_period_balances" ADD CONSTRAINT "FK_account_period_balances_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "fiscal_years" ADD CONSTRAINT "FK_fiscal_years_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_reversal_of_id" FOREIGN KEY ("reversal_of_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD CONSTRAINT "FK_journal_entries_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD CONSTRAINT "FK_journal_entries_transaction_id" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "FK_accounts_currency_id" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "FK_accounts_parent_id" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "FK_accounts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
