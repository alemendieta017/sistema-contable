import { EntityManager } from 'typeorm';
import { baseScenario } from './base.scenario';
import { LedgerBuilder } from '../helpers/ledger-builder';
import { FiscalYearEntity } from '../../entities/fiscal-year.entity';
import { PeriodEntity } from '../../entities/period.entity';
import { AccountEntity } from '../../entities/account.entity';
import { BalanceUpdateService } from '../../../../application/periods/balance-update.service';

export async function readyForClosingScenario(
  em: EntityManager,
  balanceUpdateService: BalanceUpdateService,
): Promise<{ userId: string; fiscalYearId: string; retainedEarningsAccountId: string }> {
  // 1. Ejecutar escenario base (crea usuario y monedas)
  const { user, baseCurrency } = await baseScenario(em);

  // 2. Crear las cuentas contables necesarias específicamente para este escenario de transacciones y cierre
  const accountsToCreate: Array<{
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    systemRole?: 'NET_INCOME' | 'RETAINED_EARNINGS';
  }> = [
    { name: 'Efectivo', type: 'ASSET' },
    { name: 'Capital Inicial', type: 'EQUITY' },
    { name: 'Sueldo', type: 'INCOME' },
    { name: 'Otros Ingresos', type: 'INCOME' },
    { name: 'Comida', type: 'EXPENSE' },
    { name: 'Servicios', type: 'EXPENSE' },
    { name: 'Ropa', type: 'EXPENSE' },
    { name: 'Resultado del Ejercicio', type: 'EQUITY', systemRole: 'NET_INCOME' },
    { name: 'Utilidades Retenidas', type: 'EQUITY', systemRole: 'RETAINED_EARNINGS' },
  ];

  const accountMap = new Map<string, AccountEntity>();
  for (const acc of accountsToCreate) {
    let account = await em.findOne(AccountEntity, { where: { name: acc.name, userId: user.id } });
    if (!account) {
      account = em.create(AccountEntity, {
        userId: user.id,
        name: acc.name,
        type: acc.type,
        currencyId: baseCurrency.id,
        status: 'ACTIVE',
        systemRole: acc.systemRole || null,
      });
      account = await em.save(AccountEntity, account);
    } else if (acc.systemRole && !account.systemRole) {
      account.systemRole = acc.systemRole;
      account = await em.save(AccountEntity, account);
    }
    accountMap.set(acc.name, account);
  }

  const acctEfectivo = accountMap.get('Efectivo')!;
  const acctCapital = accountMap.get('Capital Inicial')!;
  const acctSueldo = accountMap.get('Sueldo')!;
  const acctOtrosIngresos = accountMap.get('Otros Ingresos')!;
  const acctComida = accountMap.get('Comida')!;
  const acctServicios = accountMap.get('Servicios')!;
  const acctRopa = accountMap.get('Ropa')!;
  const acctRetainedEarnings = accountMap.get('Utilidades Retenidas')!;

  // 3. Crear Ejercicio Fiscal 2025
  const fyName = 'Ejercicio 2025';
  let fy2025 = await em.findOne(FiscalYearEntity, { where: { name: fyName, userId: user.id } });
  if (!fy2025) {
    fy2025 = em.create(FiscalYearEntity, {
      userId: user.id,
      name: fyName,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      status: 'OPEN',
    });
    fy2025 = await em.save(FiscalYearEntity, fy2025);
    console.log('[SEED] Ejercicio Fiscal 2025 creado.');

    // Crear 12 períodos mensuales para 2025
    for (let m = 0; m < 12; m++) {
      const period = em.create(PeriodEntity, {
        fiscalYearId: fy2025.id,
        name: `Periodo ${String(m + 1).padStart(2, '0')}/2025`,
        startDate: '2025-' + String(m + 1).padStart(2, '0') + '-01',
        endDate: new Date(Date.UTC(2025, m + 1, 0)).toISOString().split('T')[0],
        status: 'OPEN',
      });
      await em.save(PeriodEntity, period);
    }
    console.log('[SEED] 12 Periodos mensuales creados para el 2025.');
  }

  // 4. Registrar Transacciones a lo largo del año
  const builder = new LedgerBuilder(em, user.id);

  // Transacción 1: Enero 2 - Apertura
  const date1 = '2025-01-02';
  await builder.createTransaction({
    description: 'Asiento de apertura de capital inicial',
    accountingDate: date1,
    entries: [
      { accountId: acctEfectivo.id, debit: 120000, credit: 0 },
      { accountId: acctCapital.id, debit: 0, credit: 120000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date1, [
    { accountId: acctEfectivo.id, debitDiff: 120000, creditDiff: 0 },
    { accountId: acctCapital.id, debitDiff: 0, creditDiff: 120000 },
  ]);

  // Transacción 2: Enero 15 - Cobro de Sueldo
  const date2 = '2025-01-15';
  await builder.createTransaction({
    description: 'Cobro de sueldo mensual',
    accountingDate: date2,
    entries: [
      { accountId: acctEfectivo.id, debit: 15000, credit: 0 },
      { accountId: acctSueldo.id, debit: 0, credit: 15000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date2, [
    { accountId: acctEfectivo.id, debitDiff: 15000, creditDiff: 0 },
    { accountId: acctSueldo.id, debitDiff: 0, creditDiff: 15000 },
  ]);

  // Transacción 3: Febrero 10 - Gasto en Comida
  const date3 = '2025-02-10';
  await builder.createTransaction({
    description: 'Compra de víveres supermercado',
    accountingDate: date3,
    entries: [
      { accountId: acctComida.id, debit: 2000, credit: 0 },
      { accountId: acctEfectivo.id, debit: 0, credit: 2000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date3, [
    { accountId: acctComida.id, debitDiff: 2000, creditDiff: 0 },
    { accountId: acctEfectivo.id, debitDiff: 0, creditDiff: 2000 },
  ]);

  // Transacción 4: Marzo 22 - Gasto en Servicios
  const date4 = '2025-03-22';
  await builder.createTransaction({
    description: 'Pago factura de luz y agua',
    accountingDate: date4,
    entries: [
      { accountId: acctServicios.id, debit: 4000, credit: 0 },
      { accountId: acctEfectivo.id, debit: 0, credit: 4000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date4, [
    { accountId: acctServicios.id, debitDiff: 4000, creditDiff: 0 },
    { accountId: acctEfectivo.id, debitDiff: 0, creditDiff: 4000 },
  ]);

  // Transacción 5: Mayo 14 - Ingresos Extra
  const date5 = '2025-05-14';
  await builder.createTransaction({
    description: 'Servicio de consultoría contable extra',
    accountingDate: date5,
    entries: [
      { accountId: acctEfectivo.id, debit: 8000, credit: 0 },
      { accountId: acctOtrosIngresos.id, debit: 0, credit: 8000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date5, [
    { accountId: acctEfectivo.id, debitDiff: 8000, creditDiff: 0 },
    { accountId: acctOtrosIngresos.id, debitDiff: 0, creditDiff: 8000 },
  ]);

  // Transacción 6: Septiembre 5 - Gasto en Comida
  const date6 = '2025-09-05';
  await builder.createTransaction({
    description: 'Almuerzo corporativo fin de mes',
    accountingDate: date6,
    entries: [
      { accountId: acctComida.id, debit: 1500, credit: 0 },
      { accountId: acctEfectivo.id, debit: 0, credit: 1500 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date6, [
    { accountId: acctComida.id, debitDiff: 1500, creditDiff: 0 },
    { accountId: acctEfectivo.id, debitDiff: 0, creditDiff: 1500 },
  ]);

  // Transacción 7: Noviembre 18 - Gasto en Servicios
  const date7 = '2025-11-18';
  await builder.createTransaction({
    description: 'Pago mensual abono de internet',
    accountingDate: date7,
    entries: [
      { accountId: acctServicios.id, debit: 3500, credit: 0 },
      { accountId: acctEfectivo.id, debit: 0, credit: 3500 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date7, [
    { accountId: acctServicios.id, debitDiff: 3500, creditDiff: 0 },
    { accountId: acctEfectivo.id, debitDiff: 0, creditDiff: 3500 },
  ]);

  // Transacción 8: Diciembre 20 - Gasto en Ropa
  const date8 = '2025-12-20';
  await builder.createTransaction({
    description: 'Compra de indumentaria fin de año',
    accountingDate: date8,
    entries: [
      { accountId: acctRopa.id, debit: 1000, credit: 0 },
      { accountId: acctEfectivo.id, debit: 0, credit: 1000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date8, [
    { accountId: acctRopa.id, debitDiff: 1000, creditDiff: 0 },
    { accountId: acctEfectivo.id, debitDiff: 0, creditDiff: 1000 },
  ]);

  console.log('[SEED] Escenario "ready-for-closing" sembrado exitosamente.');

  return {
    userId: user.id,
    fiscalYearId: fy2025.id,
    retainedEarningsAccountId: acctRetainedEarnings.id,
  };
}
