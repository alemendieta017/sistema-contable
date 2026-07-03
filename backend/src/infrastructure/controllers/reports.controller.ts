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

@Controller('api/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly getCategoryStatisticsUseCase: GetCategoryStatisticsUseCase,
    private readonly exportExcelService: ExportExcelService,
    private readonly reconstructBalancesUseCase: ReconstructBalancesUseCase,
    private readonly balanceSheetUseCase: BalanceSheetUseCase,
    private readonly incomeStatementUseCase: IncomeStatementUseCase,
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
  ) {
    if (!periodId) {
      throw new BadRequestException('periodId is required');
    }
    return this.incomeStatementUseCase.execute(user.id, periodId);
  }
}

