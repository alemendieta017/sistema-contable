import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CurrencyEntity } from './entities/currency.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres_password',
      database: process.env.DATABASE_NAME || 'sistema_contable',
      autoLoadEntities: true,
      synchronize: true, // Set to true for dev/hot reload, but in prod we use migrations
      logging: ['query', 'error'],
    }),
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
