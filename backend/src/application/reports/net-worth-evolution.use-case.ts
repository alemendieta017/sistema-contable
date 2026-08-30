import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NetWorthEvolutionPoint, NetWorthEvolutionResponse } from '@sistema-contable/shared';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';

@Injectable()
export class NetWorthEvolutionUseCase {
  constructor(
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
  ) {}

  async execute(
    userId: string,
    options: {
      startPeriod?: string;
      endPeriod?: string;
    } = {},
  ): Promise<NetWorthEvolutionResponse> {
    const periodRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

    if (options.startPeriod && !periodRegex.test(options.startPeriod)) {
      throw new BadRequestException('Invalid startPeriod format. Must be YYYY-MM');
    }

    if (options.endPeriod && !periodRegex.test(options.endPeriod)) {
      throw new BadRequestException('Invalid endPeriod format. Must be YYYY-MM');
    }

    if (options.startPeriod && options.endPeriod && options.startPeriod > options.endPeriod) {
      throw new BadRequestException('startPeriod cannot be after endPeriod');
    }

    const qb = this.periodRepository
      .createQueryBuilder('period')
      .select('period.name', 'period')
      .addSelect('period.endDate', 'date')
      .addSelect(
        `SUM(CASE WHEN account.type = 'ASSET' THEN CAST(balance.closingBalance AS DECIMAL) ELSE 0 END)`,
        'assets',
      )
      .addSelect(
        `SUM(CASE WHEN account.type = 'LIABILITY' THEN CAST(balance.closingBalance AS DECIMAL) ELSE 0 END)`,
        'liabilities',
      )
      .leftJoin('period.balances', 'balance')
      .leftJoin('balance.account', 'account')
      .where('period.userId = :userId', { userId })
      .groupBy('period.id')
      .addGroupBy('period.name')
      .addGroupBy('period.endDate')
      .addGroupBy('period.startDate')
      .orderBy('period.startDate', 'ASC')
      .addOrderBy('period.name', 'ASC');

    if (options.startPeriod) {
      qb.andWhere('period.name >= :startPeriod', { startPeriod: options.startPeriod });
    }

    if (options.endPeriod) {
      qb.andWhere('period.name <= :endPeriod', { endPeriod: options.endPeriod });
    }

    const rawRows = await qb.getRawMany();

    const history: NetWorthEvolutionPoint[] = rawRows.map((row) => {
      const assets = Number(Number(row.assets || 0).toFixed(4));
      const liabilities = Number(Number(row.liabilities || 0).toFixed(4));
      const netWorth = Number((assets - liabilities).toFixed(4));
      return {
        period: row.period,
        date: row.date,
        assets,
        liabilities,
        netWorth,
      };
    });

    if (history.length === 0) {
      return {
        history: [],
        latest: {
          assets: 0,
          liabilities: 0,
          netWorth: 0,
        },
        change12Months: 0,
        changePercentage: 0,
      };
    }

    const latestPoint = history[history.length - 1];
    const latest = {
      assets: latestPoint.assets,
      liabilities: latestPoint.liabilities,
      netWorth: latestPoint.netWorth,
    };

    // Calculate 12-month change compared to 12 periods prior (or oldest available)
    const priorIndex = Math.max(0, history.length - 1 - 12);
    const priorPoint = history[priorIndex];
    const change12Months = Number((latest.netWorth - priorPoint.netWorth).toFixed(4));

    // Calculate percentage change; if prior baseline is zero, default to +100% or -100% for directional display
    let changePercentage = 0;
    if (priorPoint.netWorth !== 0) {
      changePercentage = Number(
        ((change12Months / Math.abs(priorPoint.netWorth)) * 100).toFixed(2),
      );
    } else if (change12Months > 0) {
      changePercentage = 100;
    } else if (change12Months < 0) {
      changePercentage = -100;
    }

    return {
      history,
      latest,
      change12Months,
      changePercentage,
    };
  }
}
