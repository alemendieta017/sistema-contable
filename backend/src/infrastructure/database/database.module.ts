import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { CurrencyEntity } from './entities/currency.entity';
import { FiscalYearEntity } from './entities/fiscal-year.entity';
import { PeriodEntity } from './entities/period.entity';
import { AccountPeriodBalanceEntity } from './entities/account-period-balance.entity';

import { UserEntity } from './entities/user.entity';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
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
      autoLoadEntities: true,
      migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
      synchronize: process.env.NODE_ENV !== 'production', // Desactivado en producción para proteger los datos
      migrationsRun: process.env.NODE_ENV === 'production', // Ejecuta migraciones automáticamente en producción
      logging: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      PasswordResetTokenEntity,
      FiscalYearEntity,
      PeriodEntity,
      AccountPeriodBalanceEntity,
    ]),
  ],
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
