import { Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { CurrencyEntity } from './entities/currency.entity';
import { PeriodEntity } from './entities/period.entity';
import { AccountPeriodBalanceEntity } from './entities/account-period-balance.entity';

import { UserEntity } from './entities/user.entity';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { BudgetReassignmentEntity } from './entities/budget-reassignment.entity';
import { BudgetEntity } from './entities/budget.entity';
import { BudgetItemEntity } from './entities/budget-item.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isProd = process.env.NODE_ENV === 'production';
        const isSsl =
          process.env.DATABASE_SSL === 'true' ||
          (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require'));

        const hostInfo = process.env.DATABASE_URL
          ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@')
          : `${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || '5432'}/${process.env.DATABASE_NAME || 'sistema_contable'}`;

        Logger.log(
          `Initializing database connection to: ${hostInfo} (SSL: ${Boolean(isSsl)}, Env: ${process.env.NODE_ENV || 'development'})`,
          'DatabaseModule',
        );

        return {
          type: 'postgres',
          ...(process.env.DATABASE_URL
            ? { url: process.env.DATABASE_URL }
            : {
                host: process.env.DATABASE_HOST || 'localhost',
                port: parseInt(process.env.DATABASE_PORT || '5432', 10),
                username: process.env.DATABASE_USER || 'postgres',
                password: process.env.DATABASE_PASSWORD || 'postgres_password',
                database: process.env.DATABASE_NAME || 'sistema_contable',
              }),
          ssl: isSsl ? { rejectUnauthorized: false } : false,
          connectTimeoutMS: 10000,
          autoLoadEntities: true,
          migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
          synchronize: !isProd,
          migrationsRun: isProd,
          logging: isProd ? ['error'] : ['query', 'error'],
        };
      },
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      PasswordResetTokenEntity,
      PeriodEntity,
      AccountPeriodBalanceEntity,
      BudgetEntity,
      BudgetItemEntity,
      BudgetReassignmentEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule implements OnApplicationBootstrap {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    const currencyRepo = this.dataSource.getRepository(CurrencyEntity);
    const count = await currencyRepo.count();
    if (count === 0) {
      await currencyRepo.save([
        {
          code: 'PYG',
          name: 'Guaraní Paraguayo',
          symbol: '₲',
          rateToBase: 1.0,
          isBase: true,
          decimalPlaces: 0,
        },
        {
          code: 'USD',
          name: 'Dólar Estadounidense',
          symbol: 'u$s',
          rateToBase: 7500.0,
          isBase: false,
          decimalPlaces: 2,
        },
      ]);
      console.log('Seeded default currencies (PYG, USD).');
    }
  }
}
