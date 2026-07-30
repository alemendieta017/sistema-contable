import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalYearEntity } from '../../infrastructure/database/entities/fiscal-year.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';

@Injectable()
export class CashFlowStatementForecastUseCase {
  constructor(
    @InjectRepository(FiscalYearEntity)
    private readonly fiscalYearRepository: Repository<FiscalYearEntity>,
    @InjectRepository(AccountPeriodBalanceEntity)
    private readonly balanceRepository: Repository<AccountPeriodBalanceEntity>,
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
  ) {}

  private async preOpenFiscalYear(
    entityManager: any,
    userId: string,
    year: number,
  ): Promise<PeriodEntity[]> {
    const name = `Ejercicio ${year}`;
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let fyEntity = await entityManager.findOne(FiscalYearEntity, {
      where: { userId, name },
      relations: ['periods'],
    });

    if (fyEntity) {
      return fyEntity.periods;
    }

    fyEntity = entityManager.create(FiscalYearEntity, {
      userId,
      name,
      startDate,
      endDate,
      status: 'PLANNING',
    });
    const savedFy = await entityManager.save(FiscalYearEntity, fyEntity);

    const friendlyMonthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    const periods = [];
    for (let m = 0; m < 12; m++) {
      const pStart = `${year}-${String(m + 1).padStart(2, '0')}-01`;
      const pEnd = new Date(Date.UTC(year, m + 1, 0)).toISOString().split('T')[0];
      const periodName = `${year}-${String(m + 1).padStart(2, '0')}`;

      const periodEntity = entityManager.create(PeriodEntity, {
        fiscalYearId: savedFy.id,
        name: periodName,
        startDate: pStart,
        endDate: pEnd,
        status: 'PLANNING',
      });
      const savedPeriod = await entityManager.save(PeriodEntity, periodEntity);
      periods.push(savedPeriod);

      const budgetFriendlyName = `${friendlyMonthNames[m]} ${year}`;
      const budgetEntity = entityManager.create(BudgetEntity, {
        userId,
        periodId: savedPeriod.id,
        name: budgetFriendlyName,
      });
      await entityManager.save(BudgetEntity, budgetEntity);
    }

    return periods;
  }

  async execute(userId: string, fiscalYearId: string, rolling?: boolean, currentDate?: Date) {
    return this.fiscalYearRepository.manager.transaction(async (entityManager) => {
      let periods: PeriodEntity[] = [];
      let fiscalYearName = '';

      if (rolling) {
        // Find the last CLOSED period for this user
        const lastClosedPeriod = await entityManager
          .getRepository(PeriodEntity)
          .createQueryBuilder('period')
          .innerJoin('period.fiscalYear', 'fiscalYear')
          .where('fiscalYear.userId = :userId', { userId })
          .andWhere('period.status = :status', { status: 'CLOSED' })
          .orderBy('period.endDate', 'DESC')
          .getOne();

        let startPeriod: PeriodEntity | null = null;
        if (lastClosedPeriod) {
          startPeriod = lastClosedPeriod;
        } else {
          // If no closed periods, start from the first period of the current fiscal year
          const fy = await entityManager.findOne(FiscalYearEntity, {
            where: { id: fiscalYearId, userId },
            relations: ['periods'],
          });
          if (!fy) throw new NotFoundException('Fiscal year not found');
          const fyPeriods = [...fy.periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
          startPeriod = fyPeriods[0] || null;
          fiscalYearName = fy.name;
        }

        if (!startPeriod) {
          throw new NotFoundException('No start period found for rolling forecast');
        }

        // Generate the 12 monthly names starting from startPeriod.startDate (YYYY-MM-DD)
        const [startYear, startMonthVal] = startPeriod.startDate.split('-').map(Number);
        const rollingPeriods: PeriodEntity[] = [];

        for (let i = 0; i < 12; i++) {
          const y = startYear + Math.floor((startMonthVal - 1 + i) / 12);
          const m = (startMonthVal - 1 + i) % 12;
          const pName = `${y}-${String(m + 1).padStart(2, '0')}`;
          const pStart = `${y}-${String(m + 1).padStart(2, '0')}-01`;

          let period = await entityManager
            .getRepository(PeriodEntity)
            .createQueryBuilder('period')
            .innerJoin('period.fiscalYear', 'fiscalYear')
            .where('fiscalYear.userId = :userId', { userId })
            .andWhere('(period.startDate = :pStart OR period.name = :pName)', { pStart, pName })
            .getOne();

          if (!period) {
            const nextYearPeriods = await this.preOpenFiscalYear(entityManager, userId, y);
            period = nextYearPeriods.find((p) => p.startDate === pStart || p.name === pName) || null;
          }

          if (period) {
            rollingPeriods.push(period);
          }
        }
        periods = rollingPeriods;
        if (!fiscalYearName) {
          fiscalYearName = `Rolling 12M (${startPeriod.name})`;
        }
      } else {
        const fy = await entityManager.findOne(FiscalYearEntity, {
          where: { id: fiscalYearId, userId },
          relations: ['periods'],
        });
        if (!fy) throw new NotFoundException('Fiscal year not found');
        periods = [...fy.periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
        fiscalYearName = fy.name;
      }

      const now = currentDate || new Date();
      const year = now.getFullYear();
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const dayStr = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${monthStr}-${dayStr}`;

      const accountsList = await entityManager.find(AccountEntity, {
        where: { userId },
      });
      const eligibleAccounts = accountsList.filter(
        (acc) => acc.type !== 'EQUITY' && !(acc.type === 'ASSET' && acc.isCashOrBank),
      );

      const accountsMap = new Map<string, {
        accountId: string;
        accountName: string;
        accountType: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY';
        parentId: string | null;
        values: { [periodId: string]: number };
      }>();

      for (const acc of eligibleAccounts) {
        accountsMap.set(acc.id, {
          accountId: acc.id,
          accountName: acc.name,
          accountType: acc.type,
          parentId: acc.parentId || null,
          values: {},
        });
      }

      const months = [];
      let runningCash = 0;

      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const isReal = period.status === 'CLOSED' || period.startDate < todayStr;

        let initialCash = 0;
        let ingresosOperativos = 0;
        let egresosOperativos = 0;
        let entradasActivoPasivo = 0;
        let salidasActivoPasivo = 0;
        let netFlow = 0;

        if (i === 0) {
          const firstBalances = await entityManager.find(AccountPeriodBalanceEntity, {
            where: {
              periodId: period.id,
              account: { isCashOrBank: true },
            },
            relations: ['account'],
          });

          initialCash = firstBalances.reduce(
            (sum, bal) => sum + Number(bal.openingBalance || 0),
            0,
          );
        } else {
          initialCash = runningCash;
        }

        if (isReal) {
          const balances = await entityManager.find(AccountPeriodBalanceEntity, {
            where: { periodId: period.id },
            relations: ['account'],
          });

          let cashNetFlow = 0;
          for (const bal of balances) {
            if (!bal.account) continue;

            if (bal.account.isCashOrBank) {
              cashNetFlow += Number(bal.totalDebits || 0) - Number(bal.totalCredits || 0);
              continue;
            }

            const accId = bal.account.id;
            const credits = Number(bal.totalCredits || 0);
            const debits = Number(bal.totalDebits || 0);

            let change = 0;
            if (bal.account.type === 'INCOME') {
              change = credits - debits;
              ingresosOperativos += change;
            } else if (bal.account.type === 'EXPENSE') {
              change = debits - credits;
              egresosOperativos += change;
            } else if (bal.account.type === 'ASSET') {
              change = credits - debits;
              if (change > 0) {
                entradasActivoPasivo += change;
              } else {
                salidasActivoPasivo += Math.abs(change);
              }
            } else if (bal.account.type === 'LIABILITY') {
              change = credits - debits;
              if (change > 0) {
                entradasActivoPasivo += change;
              } else {
                salidasActivoPasivo += Math.abs(change);
              }
            }

            const accForecast = accountsMap.get(accId);
            if (accForecast) {
              accForecast.values[period.id] = change;
            }
          }
          netFlow = cashNetFlow;
        } else {
          const budget = await entityManager.findOne(BudgetEntity, {
            where: { periodId: period.id, userId },
            relations: ['items', 'items.account'],
          });

          if (budget && budget.items) {
            for (const item of budget.items) {
              if (!item.account) continue;
              const accId = item.accountId;
              const amount = Number(item.amount || 0);

              if (item.account.type === 'INCOME') {
                ingresosOperativos += amount;
              } else if (item.account.type === 'EXPENSE') {
                egresosOperativos += amount;
              } else if (item.account.type === 'ASSET') {
                if (amount > 0) {
                  entradasActivoPasivo += amount;
                } else {
                  salidasActivoPasivo += Math.abs(amount);
                }
              } else if (item.account.type === 'LIABILITY') {
                if (amount > 0) {
                  entradasActivoPasivo += amount;
                } else {
                  salidasActivoPasivo += Math.abs(amount);
                }
              }

              const accForecast = accountsMap.get(accId);
              if (accForecast) {
                accForecast.values[period.id] = amount;
              }
            }
          }
        }

        // Fill remaining eligible accounts with 0 for this period
        for (const [_, accForecast] of accountsMap) {
          if (accForecast.values[period.id] === undefined) {
            accForecast.values[period.id] = 0;
          }
        }

        if (!isReal) {
          netFlow = ingresosOperativos + entradasActivoPasivo - egresosOperativos - salidasActivoPasivo;
        }
        const finalCash = initialCash + netFlow;
        runningCash = finalCash;

        months.push({
          periodId: period.id,
          periodName: period.name,
          status: period.status,
          initialCash,
          ingresosOperativos,
          entradasActivoPasivo,
          totalEntradas: ingresosOperativos + entradasActivoPasivo,
          egresosOperativos,
          salidasActivoPasivo,
          totalSalidas: egresosOperativos + salidasActivoPasivo,
          netFlow,
          finalCash,
          isReal,
        });
      }

      return {
        fiscalYearName,
        months,
        accounts: Array.from(accountsMap.values()),
      };
    });
  }
}
