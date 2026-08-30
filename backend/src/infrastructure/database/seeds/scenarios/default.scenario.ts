import { EntityManager } from 'typeorm';
import { baseScenario } from './base.scenario';
import { LedgerBuilder } from '../helpers/ledger-builder';
import { PeriodEntity } from '../../entities/period.entity';
import { AccountEntity } from '../../entities/account.entity';
import { BudgetEntity } from '../../entities/budget.entity';
import { BudgetItemEntity } from '../../entities/budget-item.entity';
import { BalanceUpdateService } from '../../../../application/periods/balance-update.service';
import { CashFlowDirection, FlowIntention, SystemRole } from '@sistema-contable/shared';

export async function defaultScenario(
  em: EntityManager,
  balanceUpdateService: BalanceUpdateService,
): Promise<{ userId: string }> {
  // 1. Sembrar monedas base (PYG, USD) y usuario de prueba
  const { user, baseCurrency } = await baseScenario(em);

  // 2. Plan de Cuentas Patrimonial & Operativo
  const accountsToCreate: Array<{
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    systemRole?: SystemRole;
    isCashOrBank?: boolean;
  }> = [
    // Cuenta única del sistema para patrimonio y saldos iniciales
    { name: 'Capital', type: 'EQUITY', systemRole: 'CAPITAL' },

    // Activos Líquidos y de Inversión
    { name: 'Banco Principal', type: 'ASSET', isCashOrBank: true },
    { name: 'Billetera Efectivo', type: 'ASSET', isCashOrBank: true },
    { name: 'Fondo Mutuo Inversión', type: 'ASSET', isCashOrBank: false },

    // Pasivos
    { name: 'Préstamo Personal', type: 'LIABILITY' },
    { name: 'Tarjeta de Crédito', type: 'LIABILITY' },

    // Ingresos
    { name: 'Salario', type: 'INCOME' },
    { name: 'Ingresos Extra', type: 'INCOME' },

    // Egresos
    { name: 'Alquiler', type: 'EXPENSE' },
    { name: 'Supermercado', type: 'EXPENSE' },
    { name: 'Servicios', type: 'EXPENSE' },
    { name: 'Transporte', type: 'EXPENSE' },
  ];

  const accountMap = new Map<string, AccountEntity>();
  for (const acc of accountsToCreate) {
    let account = await em.findOne(AccountEntity, {
      where: { name: acc.name, userId: user.id },
    });
    if (!account) {
      account = em.create(AccountEntity, {
        userId: user.id,
        name: acc.name,
        type: acc.type,
        currencyId: baseCurrency.id,
        status: 'ACTIVE',
        isCashOrBank: acc.isCashOrBank ?? false,
        systemRole: acc.systemRole || null,
      });
      account = await em.save(AccountEntity, account);
    } else {
      let modified = false;
      if (acc.systemRole && account.systemRole !== acc.systemRole) {
        account.systemRole = acc.systemRole;
        modified = true;
      }
      if (acc.isCashOrBank !== undefined && account.isCashOrBank !== acc.isCashOrBank) {
        account.isCashOrBank = acc.isCashOrBank;
        modified = true;
      }
      if (modified) {
        account = await em.save(AccountEntity, account);
      }
    }
    accountMap.set(acc.name, account);
  }

  const acctCapital = accountMap.get('Capital')!;
  const acctBanco = accountMap.get('Banco Principal')!;
  const acctInversion = accountMap.get('Fondo Mutuo Inversión')!;
  const acctPrestamo = accountMap.get('Préstamo Personal')!;
  const acctSalario = accountMap.get('Salario')!;
  const acctAlquiler = accountMap.get('Alquiler')!;
  const acctSuper = accountMap.get('Supermercado')!;
  const acctServicios = accountMap.get('Servicios')!;

  // 3. Crear 24 períodos mensuales continuos (2026 y 2027) con sobres de presupuesto 1:1
  const years = [2026, 2027];
  const periods: PeriodEntity[] = [];

  for (const y of years) {
    for (let m = 0; m < 12; m++) {
      const monthStr = String(m + 1).padStart(2, '0');
      const pName = `${y}-${monthStr}`;
      const startDate = `${y}-${monthStr}-01`;
      const endDate = new Date(Date.UTC(y, m + 1, 0)).toISOString().split('T')[0];

      let period = await em.findOne(PeriodEntity, {
        where: { name: pName, userId: user.id },
      });
      if (!period) {
        period = em.create(PeriodEntity, {
          userId: user.id,
          name: pName,
          startDate,
          endDate,
          status: 'OPEN',
        });
        period = await em.save(PeriodEntity, period);
      }
      periods.push(period);

      // Crear contenedor de presupuesto 1:1
      let budget = await em.findOne(BudgetEntity, {
        where: { periodId: period.id, userId: user.id },
      });
      if (!budget) {
        budget = em.create(BudgetEntity, {
          userId: user.id,
          periodId: period.id,
          name: `Presupuesto ${pName}`,
        });
        budget = await em.save(BudgetEntity, budget);

        // Sembrar ítems de presupuesto en los 4 cuadrantes
        const budgetItems: BudgetItemEntity[] = [
          // Q1: Ingresos Operativos
          em.create(BudgetItemEntity, {
            budgetId: budget.id,
            accountId: acctSalario.id,
            amount: 8000000,
            cashFlowDirection: CashFlowDirection.INGRESO_EFECTIVO,
          }),
          // Q2: Egresos Operativos
          em.create(BudgetItemEntity, {
            budgetId: budget.id,
            accountId: acctAlquiler.id,
            amount: 2500000,
            cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
          }),
          em.create(BudgetItemEntity, {
            budgetId: budget.id,
            accountId: acctSuper.id,
            amount: 1500000,
            cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
          }),
          em.create(BudgetItemEntity, {
            budgetId: budget.id,
            accountId: acctServicios.id,
            amount: 600000,
            cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
          }),
          // Q3: Ahorro e Inversiones
          em.create(BudgetItemEntity, {
            budgetId: budget.id,
            accountId: acctInversion.id,
            amount: 1500000,
            cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
            flowIntention: FlowIntention.INVEST,
          }),
          // Q4: Deudas y Financiación
          em.create(BudgetItemEntity, {
            budgetId: budget.id,
            accountId: acctPrestamo.id,
            amount: 1000000,
            cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
            flowIntention: FlowIntention.PAY,
          }),
        ];
        await em.save(BudgetItemEntity, budgetItems);
      }
    }
  }

  // 4. Registrar Transacciones Reales en el Libro Mayor
  const builder = new LedgerBuilder(em, user.id);

  // Transacción 1: Asiento de Apertura (Capital aportado a Banco e Inversiones)
  const date1 = '2026-01-02';
  await builder.createTransaction({
    description: 'Aporte de capital inicial y saldos de apertura',
    accountingDate: date1,
    entries: [
      { accountId: acctBanco.id, debit: 20000000, credit: 0 },
      { accountId: acctInversion.id, debit: 10000000, credit: 0 },
      { accountId: acctCapital.id, debit: 0, credit: 30000000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date1, [
    { accountId: acctBanco.id, debitDiff: 20000000, creditDiff: 0 },
    { accountId: acctInversion.id, debitDiff: 10000000, creditDiff: 0 },
    { accountId: acctCapital.id, debitDiff: 0, creditDiff: 30000000 },
  ]);

  // Transacción 2: Cobro de Salario Enero
  const date2 = '2026-01-30';
  await builder.createTransaction({
    description: 'Cobro de salario mensual Enero',
    accountingDate: date2,
    entries: [
      { accountId: acctBanco.id, debit: 8000000, credit: 0 },
      { accountId: acctSalario.id, debit: 0, credit: 8000000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date2, [
    { accountId: acctBanco.id, debitDiff: 8000000, creditDiff: 0 },
    { accountId: acctSalario.id, debitDiff: 0, creditDiff: 8000000 },
  ]);

  // Transacción 3: Pago de Alquiler Enero
  const date3 = '2026-01-05';
  await builder.createTransaction({
    description: 'Pago mensual de alquiler',
    accountingDate: date3,
    entries: [
      { accountId: acctAlquiler.id, debit: 2500000, credit: 0 },
      { accountId: acctBanco.id, debit: 0, credit: 2500000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date3, [
    { accountId: acctAlquiler.id, debitDiff: 2500000, creditDiff: 0 },
    { accountId: acctBanco.id, debitDiff: 0, creditDiff: 2500000 },
  ]);

  // Transacción 4: Supermercado Enero
  const date4 = '2026-01-15';
  await builder.createTransaction({
    description: 'Compras de supermercado',
    accountingDate: date4,
    entries: [
      { accountId: acctSuper.id, debit: 1200000, credit: 0 },
      { accountId: acctBanco.id, debit: 0, credit: 1200000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date4, [
    { accountId: acctSuper.id, debitDiff: 1200000, creditDiff: 0 },
    { accountId: acctBanco.id, debitDiff: 0, creditDiff: 1200000 },
  ]);

  // Transacción 5: Servicios Enero
  const date5 = '2026-01-20';
  await builder.createTransaction({
    description: 'Pago de servicios (luz, agua, internet)',
    accountingDate: date5,
    entries: [
      { accountId: acctServicios.id, debit: 600000, credit: 0 },
      { accountId: acctBanco.id, debit: 0, credit: 600000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date5, [
    { accountId: acctServicios.id, debitDiff: 600000, creditDiff: 0 },
    { accountId: acctBanco.id, debitDiff: 0, creditDiff: 600000 },
  ]);

  // Transacción 6: Cobro de Salario Febrero
  const date6 = '2026-02-28';
  await builder.createTransaction({
    description: 'Cobro de salario mensual Febrero',
    accountingDate: date6,
    entries: [
      { accountId: acctBanco.id, debit: 8000000, credit: 0 },
      { accountId: acctSalario.id, debit: 0, credit: 8000000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date6, [
    { accountId: acctBanco.id, debitDiff: 8000000, creditDiff: 0 },
    { accountId: acctSalario.id, debitDiff: 0, creditDiff: 8000000 },
  ]);

  // Transacción 7: Aporte a Fondo Mutuo Inversión en Febrero
  const date7 = '2026-02-20';
  await builder.createTransaction({
    description: 'Aporte mensual de ahorro a Fondo Mutuo',
    accountingDate: date7,
    entries: [
      { accountId: acctInversion.id, debit: 2000000, credit: 0 },
      { accountId: acctBanco.id, debit: 0, credit: 2000000 },
    ],
  });
  await balanceUpdateService.updateBalances(em, user.id, date7, [
    { accountId: acctInversion.id, debitDiff: 2000000, creditDiff: 0 },
    { accountId: acctBanco.id, debitDiff: 0, creditDiff: 2000000 },
  ]);

  console.log('[SEED] Escenario "default" sembrado exitosamente.');

  return { userId: user.id };
}
