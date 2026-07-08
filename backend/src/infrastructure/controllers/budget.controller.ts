import { Controller, Get, Post, Put, Body, Query, Param, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetEntity } from '../database/entities/budget.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { GetBudgetsSummaryUseCase } from '../../application/budgets/get-budgets-summary.use-case';
import { GetBudgetDetailUseCase } from '../../application/budgets/get-budget-detail.use-case';
import { UpdateBudgetItemsUseCase } from '../../application/budgets/update-budget-items.use-case';
import { ReplicateBudgetItemUseCase } from '../../application/budgets/replicate-budget-item.use-case';
import { GetBudgetExecutionUseCase } from '../../application/budgets/get-budget-execution.use-case';
import { CopyPreviousBudgetUseCase } from '../../application/budgets/copy-previous-budget.use-case';
import { SetBudgetDto } from './dto/set-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { ReplicateBudgetItemDto } from './dto/replicate-budget-item.dto';

@Controller('api/budgets')
@UseGuards(JwtAuthGuard)
export class BudgetController {
  constructor(
    private readonly getBudgetsSummaryUseCase: GetBudgetsSummaryUseCase,
    private readonly getBudgetDetailUseCase: GetBudgetDetailUseCase,
    private readonly updateBudgetItemsUseCase: UpdateBudgetItemsUseCase,
    private readonly replicateBudgetItemUseCase: ReplicateBudgetItemUseCase,
    private readonly getBudgetExecutionUseCase: GetBudgetExecutionUseCase,
    private readonly copyPreviousBudgetUseCase: CopyPreviousBudgetUseCase,
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
  ) {}

  @Get('summary')
  async summary(@CurrentUser() user: UserEntity, @Query('period') period: string) {
    const activePeriod = period || new Date().toISOString().substring(0, 7);
    return this.getBudgetsSummaryUseCase.execute(user.id, activePeriod);
  }

  @Get('by-period/:periodId')
  async getBudgetDetail(@CurrentUser() user: UserEntity, @Param('periodId') periodId: string) {
    return this.getBudgetDetailUseCase.execute(user.id, periodId);
  }

  @Put('by-period/:periodId/items')
  async updateBudgetItems(
    @CurrentUser() user: UserEntity,
    @Param('periodId') periodId: string,
    @Body() body: UpdateBudgetDto,
  ) {
    return this.updateBudgetItemsUseCase.execute(user.id, periodId, body);
  }

  @Post('by-period/:periodId/copy-previous')
  async copyPreviousBudget(@CurrentUser() user: UserEntity, @Param('periodId') periodId: string) {
    return this.copyPreviousBudgetUseCase.execute(user.id, periodId);
  }

  @Post('replicate')
  async replicateBudgetItem(@CurrentUser() user: UserEntity, @Body() body: ReplicateBudgetItemDto) {
    return this.replicateBudgetItemUseCase.execute(user.id, body);
  }

  @Get('execution-report')
  async getBudgetExecution(@CurrentUser() user: UserEntity, @Query('periodId') periodId: string) {
    return this.getBudgetExecutionUseCase.execute(user.id, periodId);
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
