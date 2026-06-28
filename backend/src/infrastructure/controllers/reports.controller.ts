import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { GetCategoryStatisticsUseCase } from '../../application/reports/get-category-statistics.use-case';
import { ExportExcelService } from '../../application/reports/export-excel.service';

@Controller('api/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly getCategoryStatisticsUseCase: GetCategoryStatisticsUseCase,
    private readonly exportExcelService: ExportExcelService,
  ) {}

  @Get('statistics')
  async getStatistics(
    @CurrentUser() user: UserEntity,
    @Query('period') period: string,
    @Query('type') type: 'INCOME' | 'EXPENSE',
  ) {
    const activePeriod = period || new Date().toISOString().substring(0, 7);
    const activeType = type || 'EXPENSE';
    return this.getCategoryStatisticsUseCase.execute(user.id, activePeriod, activeType);
  }

  @Get('excel')
  async getExcel(@CurrentUser() user: UserEntity, @Res() res: Response) {
    const buffer = await this.exportExcelService.execute(user.id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="RegistroContable.xlsx"');
    res.end(buffer);
  }
}
