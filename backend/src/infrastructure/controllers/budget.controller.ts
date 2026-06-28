import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetEntity } from '../database/entities/budget.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { GetBudgetsSummaryUseCase } from '../../application/budgets/get-budgets-summary.use-case';
import { SetBudgetDto } from './dto/set-budget.dto';

@Controller('api/budgets')
@UseGuards(JwtAuthGuard)
export class BudgetController {
  constructor(
    private readonly getBudgetsSummaryUseCase: GetBudgetsSummaryUseCase,
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
  ) {}

  @Get('summary')
  async summary(@CurrentUser() user: UserEntity, @Query('period') period: string) {
    const activePeriod = period || new Date().toISOString().substring(0, 7);
    return this.getBudgetsSummaryUseCase.execute(user.id, activePeriod);
  }

  @Post()
  async setBudget(@CurrentUser() user: UserEntity, @Body() body: SetBudgetDto) {
    const existing = await this.budgetRepository.findOne({
      where: { userId: user.id, accountId: body.accountId, period: body.period },
    });

    if (existing) {
      existing.limit = body.limit;
      return this.budgetRepository.save(existing);
    }

    const budget = this.budgetRepository.create({
      userId: user.id,
      accountId: body.accountId,
      limit: body.limit,
      period: body.period,
    });
    return this.budgetRepository.save(budget);
  }
}
