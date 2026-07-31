import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1722470400000 implements MigrationInterface {
  name = 'InitialSchema1722470400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // 1. Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // 2. Currencies table
    await queryRunner.query(`
      CREATE TABLE "currencies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying NOT NULL,
        "name" character varying NOT NULL,
        "symbol" character varying NOT NULL,
        "rate_to_base" numeric(18,4) NOT NULL DEFAULT '1',
        "is_base" boolean NOT NULL DEFAULT false,
        "decimal_places" integer NOT NULL DEFAULT '2',
        CONSTRAINT "UQ_currencies_code" UNIQUE ("code"),
        CONSTRAINT "PK_currencies_id" PRIMARY KEY ("id")
      )
    `);

    // 3. Accounts table
    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "parent_id" uuid,
        "type" character varying(15) NOT NULL,
        "currency_id" uuid NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'ACTIVE',
        "is_cash_or_bank" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        CONSTRAINT "PK_accounts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_accounts_parent_id" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_accounts_currency_id" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_accounts_user_id_name" ON "accounts" ("user_id", "name")
    `);

    // 4. Fiscal Years table
    await queryRunner.query(`
      CREATE TABLE "fiscal_years" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'OPEN',
        CONSTRAINT "PK_fiscal_years_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fiscal_years_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_fiscal_years_user_id_name" ON "fiscal_years" ("user_id", "name")
    `);

    // 5. Periods table
    await queryRunner.query(`
      CREATE TABLE "periods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fiscal_year_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'OPEN',
        CONSTRAINT "PK_periods_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_periods_fiscal_year_id" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_periods_fiscal_year_id_name" ON "periods" ("fiscal_year_id", "name")
    `);

    // 6. Account Period Balances table
    await queryRunner.query(`
      CREATE TABLE "account_period_balances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "period_id" uuid NOT NULL,
        "opening_balance" numeric(18,4) NOT NULL DEFAULT '0',
        "total_debits" numeric(18,4) NOT NULL DEFAULT '0',
        "total_credits" numeric(18,4) NOT NULL DEFAULT '0',
        "closing_balance" numeric(18,4) NOT NULL DEFAULT '0',
        "last_updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_account_period_balances_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_account_period_balances_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_account_period_balances_period_id" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_account_period_balances_account_id_period_id" ON "account_period_balances" ("account_id", "period_id")
    `);

    // 7. Budgets table
    await queryRunner.query(`
      CREATE TABLE "budgets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "period_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "account_id" uuid,
        "limit" numeric(18,4),
        "period" character varying(7),
        CONSTRAINT "UQ_budgets_period_id" UNIQUE ("period_id"),
        CONSTRAINT "PK_budgets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_budgets_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_budgets_period_id" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_budgets_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // 8. Budget Items table
    await queryRunner.query(`
      CREATE TABLE "budget_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "budget_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        "amount" numeric(18,4) NOT NULL,
        CONSTRAINT "PK_budget_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_budget_items_budget_id" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_budget_items_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_budget_items_budget_id_account_id" ON "budget_items" ("budget_id", "account_id")
    `);

    // 9. Transactions table
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "accounting_date" date NOT NULL,
        "description" character varying NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'POSTED',
        "reversal_of_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_transactions_reversal_of_id" FOREIGN KEY ("reversal_of_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // 10. Journal Entries table
    await queryRunner.query(`
      CREATE TABLE "journal_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "transaction_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        "entry_type" character varying(6) NOT NULL,
        "amount" numeric(18,4) NOT NULL,
        "amount_base" numeric(18,4) NOT NULL,
        "rate_at_date" numeric(18,4) NOT NULL DEFAULT '1',
        CONSTRAINT "PK_journal_entries_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_journal_entries_transaction_id" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_journal_entries_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "journal_entries"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP INDEX "IDX_budget_items_budget_id_account_id"`);
    await queryRunner.query(`DROP TABLE "budget_items"`);
    await queryRunner.query(`DROP TABLE "budgets"`);
    await queryRunner.query(`DROP INDEX "IDX_account_period_balances_account_id_period_id"`);
    await queryRunner.query(`DROP TABLE "account_period_balances"`);
    await queryRunner.query(`DROP INDEX "IDX_periods_fiscal_year_id_name"`);
    await queryRunner.query(`DROP TABLE "periods"`);
    await queryRunner.query(`DROP INDEX "IDX_fiscal_years_user_id_name"`);
    await queryRunner.query(`DROP TABLE "fiscal_years"`);
    await queryRunner.query(`DROP INDEX "IDX_accounts_user_id_name"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP TABLE "currencies"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
