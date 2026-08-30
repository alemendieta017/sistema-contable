import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, LessThan } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { getFriendlyPeriodName } from '../../domain/common/date.utils';
import {
  EnsurePeriodRequest,
  EnsurePeriodResponse,
  EnsurePeriodRequestSchema,
} from '@sistema-contable/shared';

@Injectable()
export class EnsurePeriodService {
  constructor(
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(AccountPeriodBalanceEntity)
    private readonly balanceRepository: Repository<AccountPeriodBalanceEntity>,
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private normalizePeriod(periodInput: string): string {
    if (!periodInput) {
      throw new BadRequestException('Period is required');
    }
    const normalized = periodInput.length >= 7 ? periodInput.substring(0, 7) : periodInput;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(normalized)) {
      throw new BadRequestException(`Period '${periodInput}' must be in YYYY-MM format`);
    }
    return normalized;
  }

  private getNextMonth(year: number, month: number): { year: number; month: number } {
    if (month === 12) {
      return { year: year + 1, month: 1 };
    }
    return { year, month: month + 1 };
  }

  private getMonthsSequence(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number,
  ): string[] {
    const months: string[] = [];
    let y = startYear;
    let m = startMonth;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      const next = this.getNextMonth(y, m);
      y = next.year;
      m = next.month;
    }
    return months;
  }

  async ensurePeriod(
    emOrUserId: EntityManager | string,
    userIdOrPeriod: string,
    periodOrNone?: string,
  ): Promise<PeriodEntity> {
    let em: EntityManager;
    let userId: string;
    let periodInput: string;

    if (typeof emOrUserId === 'string') {
      em = this.dataSource.manager;
      userId = emOrUserId;
      periodInput = userIdOrPeriod;
    } else {
      em = emOrUserId;
      userId = userIdOrPeriod;
      periodInput = periodOrNone!;
    }

    const targetMonthStr = this.normalizePeriod(periodInput);

    // 1. Check if target period already exists
    const existingTarget = await em.findOne(PeriodEntity, {
      where: { userId, name: targetMonthStr },
    });
    if (existingTarget) {
      return existingTarget;
    }

    // 2. Identify gap filling sequence
    const [targetYear, targetMonth] = targetMonthStr.split('-').map(Number);

    // Find the latest existing period prior to targetMonthStr
    const priorPeriod = await em
      .createQueryBuilder(PeriodEntity, 'period')
      .where('period.userId = :userId', { userId })
      .andWhere('period.name < :targetMonth', { targetMonth: targetMonthStr })
      .orderBy('period.name', 'DESC')
      .getOne();

    let sequenceToCreate: string[] = [];
    if (priorPeriod) {
      const [priorYear, priorMonth] = priorPeriod.name.split('-').map(Number);
      const nextAfterPrior = this.getNextMonth(priorYear, priorMonth);
      sequenceToCreate = this.getMonthsSequence(
        nextAfterPrior.year,
        nextAfterPrior.month,
        targetYear,
        targetMonth,
      );
    } else {
      sequenceToCreate = [targetMonthStr];
    }

    // 3. Sequentially create all periods in sequence with initial balance snapshots
    const accounts = await em.find(AccountEntity, { where: { userId } });
    let createdTargetPeriod: PeriodEntity | null = null;

    for (const monthStr of sequenceToCreate) {
      const [y, m] = monthStr.split('-').map(Number);
      const startDate = `${monthStr}-01`;
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

      let currentPeriod = await em.findOne(PeriodEntity, {
        where: { userId, name: monthStr },
      });

      if (!currentPeriod) {
        currentPeriod = em.create(PeriodEntity, {
          userId,
          name: monthStr,
          startDate,
          endDate,
          status: 'OPEN',
        });
        currentPeriod = await em.save(PeriodEntity, currentPeriod);
      }

      if (monthStr === targetMonthStr) {
        createdTargetPeriod = currentPeriod;
      }

      // Ensure default budget envelope
      const existingBudget = await em.findOne(BudgetEntity, {
        where: { userId, periodId: currentPeriod.id },
      });
      if (!existingBudget) {
        const friendlyName = getFriendlyPeriodName(monthStr);
        const budget = em.create(BudgetEntity, {
          userId,
          periodId: currentPeriod.id,
          name: friendlyName,
        });
        await em.save(BudgetEntity, budget);
      }

      // Initial balance snapshots for accounts
      const prevPeriod = await em.findOne(PeriodEntity, {
        where: { userId, endDate: LessThan(startDate) },
        order: { endDate: 'DESC' },
      });

      const prevBalanceMap = new Map<string, number>();
      if (prevPeriod) {
        const prevBalances = await em.find(AccountPeriodBalanceEntity, {
          where: { periodId: prevPeriod.id },
        });
        for (const bal of prevBalances) {
          prevBalanceMap.set(bal.accountId, Number(bal.closingBalance));
        }
      }

      const existingBalances = await em.find(AccountPeriodBalanceEntity, {
        where: { periodId: currentPeriod.id },
      });
      const existingAccountIds = new Set(existingBalances.map((b) => b.accountId));
      const balancesToCreate: AccountPeriodBalanceEntity[] = [];

      for (const account of accounts) {
        if (!existingAccountIds.has(account.id)) {
          const isTemporary = account.type === 'INCOME' || account.type === 'EXPENSE';
          const inherited = isTemporary ? 0 : (prevBalanceMap.get(account.id) ?? 0);

          const newBalance = em.create(AccountPeriodBalanceEntity, {
            accountId: account.id,
            periodId: currentPeriod.id,
            openingBalance: inherited,
            totalDebits: 0,
            totalCredits: 0,
            closingBalance: inherited,
          });
          balancesToCreate.push(newBalance);
        }
      }

      if (balancesToCreate.length > 0) {
        await em.save(AccountPeriodBalanceEntity, balancesToCreate);
      }
    }

    return createdTargetPeriod!;
  }

  async execute(userId: string, dto: EnsurePeriodRequest): Promise<EnsurePeriodResponse> {
    const parsed = EnsurePeriodRequestSchema.parse(dto);
    const period = await this.ensurePeriod(userId, parsed.period);
    return {
      id: period.id,
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
      status: period.status,
      userId: period.userId,
      created: true,
    };
  }
}
