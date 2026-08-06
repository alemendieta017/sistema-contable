import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSystemRoleToAccounts1722880000000 implements MigrationInterface {
  name = 'AddSystemRoleToAccounts1722880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "system_role" character varying(30)`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_accounts_user_id_system_role" ON "accounts" ("user_id", "system_role") WHERE system_role IS NOT NULL`,
    );

    // Auto-assign or provision NET_INCOME and RETAINED_EARNINGS for existing users
    const users: Array<{ id: string }> = await queryRunner.query(`SELECT "id" FROM "users"`);
    const defaultCurrency: Array<{ id: string }> = await queryRunner.query(
      `SELECT "id" FROM "currencies" WHERE "is_base" = true LIMIT 1`,
    );
    const currencyId = defaultCurrency[0]?.id;

    for (const user of users) {
      // 1. NET_INCOME system account
      const netIncomeExisting: Array<{ id: string }> = await queryRunner.query(
        `SELECT "id" FROM "accounts" WHERE "user_id" = $1 AND "system_role" = 'NET_INCOME'`,
        [user.id],
      );

      if (netIncomeExisting.length === 0) {
        const matchingByName: Array<{ id: string }> = await queryRunner.query(
          `SELECT "id" FROM "accounts" WHERE "user_id" = $1 AND "type" = 'EQUITY' AND LOWER("name") IN ('resultado del ejercicio', 'net income', 'ganancia del ejercicio', 'resultado neto') LIMIT 1`,
          [user.id],
        );

        if (matchingByName.length > 0) {
          await queryRunner.query(
            `UPDATE "accounts" SET "system_role" = 'NET_INCOME' WHERE "id" = $1`,
            [matchingByName[0].id],
          );
        } else if (currencyId) {
          await queryRunner.query(
            `INSERT INTO "accounts" ("id", "user_id", "name", "type", "currency_id", "status", "system_role", "is_cash_or_bank")
             VALUES (gen_random_uuid(), $1, 'Resultado del Ejercicio', 'EQUITY', $2, 'ACTIVE', 'NET_INCOME', false)`,
            [user.id, currencyId],
          );
        }
      }

      // 2. RETAINED_EARNINGS system account
      const retainedEarningsExisting: Array<{ id: string }> = await queryRunner.query(
        `SELECT "id" FROM "accounts" WHERE "user_id" = $1 AND "system_role" = 'RETAINED_EARNINGS'`,
        [user.id],
      );

      if (retainedEarningsExisting.length === 0) {
        const matchingByName: Array<{ id: string }> = await queryRunner.query(
          `SELECT "id" FROM "accounts" WHERE "user_id" = $1 AND "type" = 'EQUITY' AND LOWER("name") IN ('resultados acumulados', 'utilidades retenidas', 'retained earnings', 'ganancias acumuladas') LIMIT 1`,
          [user.id],
        );

        if (matchingByName.length > 0) {
          await queryRunner.query(
            `UPDATE "accounts" SET "system_role" = 'RETAINED_EARNINGS' WHERE "id" = $1`,
            [matchingByName[0].id],
          );
        } else if (currencyId) {
          await queryRunner.query(
            `INSERT INTO "accounts" ("id", "user_id", "name", "type", "currency_id", "status", "system_role", "is_cash_or_bank")
             VALUES (gen_random_uuid(), $1, 'Resultados Acumulados', 'EQUITY', $2, 'ACTIVE', 'RETAINED_EARNINGS', false)`,
            [user.id, currencyId],
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_accounts_user_id_system_role"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "system_role"`);
  }
}
