import { Controller, Get, Post, Query, UseGuards, Res, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { GetCategoryStatisticsUseCase } from '../../application/reports/get-category-statistics.use-case';
import { ExportExcelService } from '../../application/reports/export-excel.service';
import { ReconstructBalancesUseCase } from '../../application/periods/reconstruct-balances.use-case';
import { BalanceSheetUseCase } from '../../application/periods/balance-sheet.use-case';
import { IncomeStatementUseCase } from '../../application/periods/income-statement.use-case';
import { IncomeStatementForecastUseCase } from '../../application/reports/income-statement-forecast.use-case';
import { CashFlowStatementForecastUseCase } from '../../application/reports/cash-flow-statement.use-case';

@Controller('api/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly getCategoryStatisticsUseCase: GetCategoryStatisticsUseCase,
    private readonly exportExcelService: ExportExcelService,
    private readonly reconstructBalancesUseCase: ReconstructBalancesUseCase,
    private readonly balanceSheetUseCase: BalanceSheetUseCase,
    private readonly incomeStatementUseCase: IncomeStatementUseCase,
    private readonly incomeStatementForecastUseCase: IncomeStatementForecastUseCase,
    private readonly cashFlowStatementForecastUseCase: CashFlowStatementForecastUseCase,
  ) {}

  @Get('statistics')
  async getStatistics(
    @CurrentUser() user: UserEntity,
    @Query('period') period: string,
    @Query('type') type: 'INCOME' | 'EXPENSE',
    @Query('timezoneOffset') timezoneOffset?: string,
  ) {
    const activePeriod = period || new Date().toISOString().substring(0, 7);
    const activeType = type || 'EXPENSE';
    const offset = timezoneOffset !== undefined ? Number(timezoneOffset) : 0;
    return this.getCategoryStatisticsUseCase.execute(user.id, activePeriod, activeType, offset);
  }

  @Get('excel')
  async getExcel(@CurrentUser() user: UserEntity, @Res() res: Response) {
    const buffer = await this.exportExcelService.execute(user.id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="RegistroContable.xlsx"');
    res.end(buffer);
  }

  @Post('reconstruct-balances')
  async reconstructBalances(@CurrentUser() user: UserEntity) {
    return this.reconstructBalancesUseCase.execute(user.id);
  }

  @Get('balance-sheet')
  async getBalanceSheet(
    @CurrentUser() user: UserEntity,
    @Query('mode') mode?: 'period' | 'date' | 'comparative',
    @Query('periodId') periodId?: string,
    @Query('date') date?: string,
    @Query('periodIds') periodIds?: string | string[],
    @Query('periodIds[]') periodIdsArray?: string | string[],
    @Query('depth') depth?: string,
  ) {
    const activeMode = mode || 'period';
    let pIds: string[] | undefined = undefined;
    const rawIds = periodIds !== undefined ? periodIds : periodIdsArray;
    if (rawIds !== undefined) {
      pIds = Array.isArray(rawIds) ? rawIds : [rawIds];
    }
    const parsedDepth = depth !== undefined ? Number(depth) : undefined;

    return this.balanceSheetUseCase.execute(user.id, {
      mode: activeMode,
      periodId,
      date,
      periodIds: pIds,
      depth: parsedDepth,
    });
  }

  @Get('income-statement')
  async getIncomeStatement(
    @CurrentUser() user: UserEntity,
    @Query('periodId') periodId: string,
    @Query('mode') mode?: 'real' | 'projected',
  ) {
    if (!periodId) {
      throw new BadRequestException('periodId is required');
    }
    const activeMode = mode === 'projected' ? 'projected' : 'real';
    return this.incomeStatementUseCase.execute(user.id, periodId, activeMode);
  }

  @Get('income-statement/real-vs-projected')
  async getIncomeStatementRealVsProjected(
    @CurrentUser() user: UserEntity,
    @Query('startPeriod') startPeriod?: string,
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('rolling') rolling?: string,
    @Query('months') months?: string,
  ) {
    const targetStart = startPeriod || fiscalYearId;
    const isRolling = rolling === undefined || rolling === 'true';
    const parsedMonths = months ? Math.min(24, Math.max(1, parseInt(months, 10))) : 12;
    return this.incomeStatementForecastUseCase.execute(
      user.id,
      targetStart,
      isRolling,
      undefined,
      parsedMonths,
    );
  }

  @Get('cash-flow/real-vs-projected')
  async getCashFlowRealVsProjected(
    @CurrentUser() user: UserEntity,
    @Query('startPeriod') startPeriod?: string,
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('rolling') rolling?: string,
    @Query('months') months?: string,
  ) {
    const targetStart = startPeriod || fiscalYearId;
    const isRolling = rolling === undefined || rolling === 'true';
    const parsedMonths = months ? Math.min(24, Math.max(1, parseInt(months, 10))) : 12;
    return this.cashFlowStatementForecastUseCase.execute(
      user.id,
      targetStart,
      isRolling,
      undefined,
      parsedMonths,
    );
  }
}
