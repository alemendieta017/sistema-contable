import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';
import { IBudgetReplicateDto, IBudgetReplicateResponse } from '../../domain/budgets/budget.model';

@Injectable()
export class ReplicateBudgetItemUseCase {
  constructor(
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, dto: IBudgetReplicateDto): Promise<IBudgetReplicateResponse> {
    return this.dataSource.transaction(async (entityManager) => {
      // 1. Fetch period and check if user owns it
      const period = await entityManager.findOne(PeriodEntity, {
        where: { id: dto.periodId },
        relations: ['fiscalYear'],
      });

      if (!period || period.fiscalYear.userId !== userId) {
        throw new NotFoundException('Period not found');
      }

      // 2. Validate account exists, belongs to the user, and is eligible
      const account = await entityManager.findOne(AccountEntity, {
        where: { id: dto.accountId, userId },
      });

      if (!account) {
        throw new BadRequestException('Account not found');
      }
      if (account.status !== 'ACTIVE') {
        throw new BadRequestException(`Account ${account.name} is inactive`);
      }
      if (account.type === 'EQUITY') {
        throw new BadRequestException(`Cannot budget for EQUITY account ${account.name}`);
      }
      if (account.isCashOrBank) {
        throw new BadRequestException(`Cannot budget for Cash/Bank account ${account.name}`);
      }

      // 3. Find all 12 periods of that fiscal year
      const allPeriods = await entityManager.find(PeriodEntity, {
        where: { fiscalYearId: period.fiscalYearId },
        order: { name: 'ASC' },
      });

      const replicatedPeriods: string[] = [];

      // 4. Save/update the budget item in each period
      for (const p of allPeriods) {
        // Find or create budget for the period
        let budget = await entityManager.findOne(BudgetEntity, {
          where: { userId, periodId: p.id },
        });

        if (!budget) {
          const [yearStr, monthStr] = p.name.split('-');
          const monthIndex = parseInt(monthStr, 10) - 1;
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
          const budgetFriendlyName = `${friendlyMonthNames[monthIndex]} ${yearStr}`;

          budget = entityManager.create(BudgetEntity, {
            userId,
            periodId: p.id,
            name: budgetFriendlyName,
          });
          budget = await entityManager.save(BudgetEntity, budget);
        }

        // Find or create budget item for the budget and account
        let budgetItem = await entityManager.findOne(BudgetItemEntity, {
          where: { budgetId: budget.id, accountId: dto.accountId },
        });

        if (budgetItem) {
          budgetItem.amount = dto.amount;
        } else {
          budgetItem = entityManager.create(BudgetItemEntity, {
            budgetId: budget.id,
            accountId: dto.accountId,
            amount: dto.amount,
          });
        }

        await entityManager.save(BudgetItemEntity, budgetItem);
        replicatedPeriods.push(p.name);
      }

      return {
        success: true,
        replicatedPeriods,
      };
    });
  }
}
