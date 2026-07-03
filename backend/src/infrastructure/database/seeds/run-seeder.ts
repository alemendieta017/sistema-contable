import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { DataSource } from 'typeorm';
import { baseScenario } from './scenarios/base.scenario';
import { readyForClosingScenario } from './scenarios/ready-for-closing.scenario';
import { closedYearScenario } from './scenarios/closed-year.scenario';
import { BalanceUpdateService } from '../../../application/periods/balance-update.service';
import { CloseFiscalYearUseCase } from '../../../application/periods/close-fiscal-year.use-case';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const balanceUpdateService = app.get(BalanceUpdateService);
  const closeFiscalYearUseCase = app.get(CloseFiscalYearUseCase);

  const args = process.argv.slice(2);
  const scenarioArg = args.find((arg) => arg.startsWith('--scenario='));
  const scenario = scenarioArg ? scenarioArg.split('=')[1] : 'ready-for-closing';

  console.log(`[SEEDER] Iniciando sembrado para el escenario: "${scenario}"...`);

  // Limpieza inicial de la base de datos para garantizar idempotencia
  await dataSource.query(
    'TRUNCATE TABLE journal_entries, transactions, account_period_balances, periods, fiscal_years, accounts, currencies, users RESTART IDENTITY CASCADE',
  );
  console.log('[SEEDER] Tablas limpiadas exitosamente.');

  // Ejecutamos los escenarios directamente usando el EntityManager del DataSource
  // Esto permite que UseCases internos abran sus propias transacciones serializables
  // y puedan ver los datos insertados secuencialmente.
  const em = dataSource.manager;
  switch (scenario) {
    case 'base':
      await baseScenario(em);
      break;
    case 'ready-for-closing':
      await readyForClosingScenario(em, balanceUpdateService);
      break;
    case 'closed-year':
      await closedYearScenario(em, balanceUpdateService, closeFiscalYearUseCase);
      break;
    default:
      console.error(`[SEEDER] Escenario desconocido: "${scenario}".`);
      process.exit(1);
  }

  console.log('[SEEDER] Sembrado finalizado con éxito.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('[SEEDER] Error crítico durante el sembrado:', err);
  process.exit(1);
});
