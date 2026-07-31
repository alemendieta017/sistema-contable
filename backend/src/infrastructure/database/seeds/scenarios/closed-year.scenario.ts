import { EntityManager } from 'typeorm';
import { readyForClosingScenario } from './ready-for-closing.scenario';
import { FiscalYearEntity } from '../../entities/fiscal-year.entity';
import { PeriodEntity } from '../../entities/period.entity';
import {
  CloseFiscalYearUseCase,
  CloseFiscalYearDto,
} from '../../../../application/periods/close-fiscal-year.use-case';
import { BalanceUpdateService } from '../../../../application/periods/balance-update.service';

export async function closedYearScenario(
  em: EntityManager,
  balanceUpdateService: BalanceUpdateService,
  closeFiscalYearUseCase: CloseFiscalYearUseCase,
): Promise<void> {
  // 1. Ejecutar escenario intermedio (crea ejercicio 2025 y sus transacciones)
  const { userId, fiscalYearId, retainedEarningsAccountId } = await readyForClosingScenario(
    em,
    balanceUpdateService,
  );

  // 2. Crear Ejercicio Fiscal 2026 (y sus 12 períodos) ANTES del cierre
  // Esto permite que al cerrar el 2025, los saldos del balance (Activos/Pasivos/Patrimonio) se arrastren como "opening balances" de 2026.
  const fy2026Name = 'Ejercicio 2026';
  let fy2026 = await em.findOne(FiscalYearEntity, { where: { name: fy2026Name, userId } });
  if (!fy2026) {
    fy2026 = em.create(FiscalYearEntity, {
      userId,
      name: fy2026Name,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'OPEN',
    });
    fy2026 = await em.save(FiscalYearEntity, fy2026);

    for (let m = 0; m < 12; m++) {
      const period = em.create(PeriodEntity, {
        fiscalYearId: fy2026.id,
        name: `Periodo ${String(m + 1).padStart(2, '0')}/2026`,
        startDate: '2026-' + String(m + 1).padStart(2, '0') + '-01',
        endDate: new Date(Date.UTC(2026, m + 1, 0)).toISOString().split('T')[0],
        status: 'OPEN',
      });
      await em.save(PeriodEntity, period);
    }
    console.log('[SEED] Ejercicio y Periodos 2026 creados para recibir saldos iniciales.');
  }

  // 3. Ejecutar el Cierre del Ejercicio Fiscal 2025 usando el UseCase real
  const dto: CloseFiscalYearDto = {
    retainedEarningsAccountId,
  };

  console.log('[SEED] Ejecutando CloseFiscalYearUseCase de forma programática...');
  await closeFiscalYearUseCase.execute(userId, fiscalYearId, dto);
  console.log('[SEED] Ejercicio 2025 cerrado formalmente. Saldos propagados a 2026.');
}
