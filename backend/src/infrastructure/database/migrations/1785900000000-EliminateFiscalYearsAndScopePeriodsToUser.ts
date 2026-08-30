import { MigrationInterface, QueryRunner } from 'typeorm';

export class EliminateFiscalYearsAndScopePeriodsToUser1785900000000 implements MigrationInterface {
  name = 'EliminateFiscalYearsAndScopePeriodsToUser1785900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop foreign key constraints on periods referencing fiscal_years
    await queryRunner.query(
      `ALTER TABLE "periods" DROP CONSTRAINT IF EXISTS "FK_periods_fiscal_year_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "periods" DROP CONSTRAINT IF EXISTS "FK_f8db0265716568b71f3861729f0"`,
    );

    // 2. Drop old unique indexes referencing fiscal_year_id
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_periods_fiscal_year_id_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_b259b2ccd41b1b61d7fe5bcf0f"`);

    // 3. Add user_id column to periods if not already present and backfill from fiscal_years if possible
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'periods' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE "periods" ADD COLUMN "user_id" uuid;
          IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'fiscal_years'
          ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'periods' AND column_name = 'fiscal_year_id'
          ) THEN
            UPDATE "periods" p 
            SET "user_id" = fy."user_id" 
            FROM "fiscal_years" fy 
            WHERE p."fiscal_year_id" = fy."id";
          END IF;
        END IF;
      END $$;
    `);

    // Clean up any orphaned periods that could not be assigned a user_id before setting NOT NULL
    await queryRunner.query(`DELETE FROM "periods" WHERE "user_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "periods" ALTER COLUMN "user_id" SET NOT NULL`);

    // 4. Drop legacy fiscal_year_id column from periods
    await queryRunner.query(`ALTER TABLE "periods" DROP COLUMN IF EXISTS "fiscal_year_id"`);

    // 5. Add user_id foreign key constraint with cascade on delete
    await queryRunner.query(`ALTER TABLE "periods" DROP CONSTRAINT IF EXISTS "FK_periods_user_id"`);
    await queryRunner.query(
      `ALTER TABLE "periods" DROP CONSTRAINT IF EXISTS "FK_371c9eeb3f52d6a13b5a4c854f3"`,
    );
    await queryRunner.query(`
      ALTER TABLE "periods" 
      ADD CONSTRAINT "FK_371c9eeb3f52d6a13b5a4c854f3" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // 6. Create composite unique and chronological indexes for periods
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_af91b7d494efdd8bbc2fb7af73"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_periods_user_id_name"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_af91b7d494efdd8bbc2fb7af73" ON "periods" ("user_id", "name")`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_b5e61d8367c798a384400dd834"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_periods_user_id_start_date"`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b5e61d8367c798a384400dd834" ON "periods" ("user_id", "start_date")`,
    );

    // 7. Drop legacy fiscal_years table and its indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_fiscal_years_user_id_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_07eaff68656ffc520fb545e677"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_years" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Recreate fiscal_years table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fiscal_years" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'OPEN',
        CONSTRAINT "PK_fiscal_years_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fiscal_years_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_fiscal_years_user_id_name" ON "fiscal_years" ("user_id", "name")`,
    );

    // 2. Add fiscal_year_id back to periods
    await queryRunner.query(`ALTER TABLE "periods" ADD COLUMN IF NOT EXISTS "fiscal_year_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "periods" ADD CONSTRAINT "FK_periods_fiscal_year_id" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // 3. Drop user-scoped indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_af91b7d494efdd8bbc2fb7af73"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_b5e61d8367c798a384400dd834"`);
    await queryRunner.query(
      `ALTER TABLE "periods" DROP CONSTRAINT IF EXISTS "FK_371c9eeb3f52d6a13b5a4c854f3"`,
    );
  }
}
