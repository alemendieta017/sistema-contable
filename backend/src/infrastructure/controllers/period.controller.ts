import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalYearEntity } from '../database/entities/fiscal-year.entity';
import { PeriodEntity } from '../database/entities/period.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { CreateFiscalYearUseCase, CreateFiscalYearDto } from '../../application/periods/create-fiscal-year.use-case';
import { UpdatePeriodUseCase } from '../../application/periods/update-period.use-case';
import { CloseFiscalYearUseCase, CloseFiscalYearDto } from '../../application/periods/close-fiscal-year.use-case';
import { UpdatePeriodRequestSchema, CloseFiscalYearRequestSchema } from '@sistema-contable/shared';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class PeriodController {
  constructor(
    private readonly createFiscalYearUseCase: CreateFiscalYearUseCase,
    private readonly updatePeriodUseCase: UpdatePeriodUseCase,
    private readonly closeFiscalYearUseCase: CloseFiscalYearUseCase,
    @InjectRepository(FiscalYearEntity)
    private readonly fiscalYearRepository: Repository<FiscalYearEntity>,
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
  ) {}

  @Get('fiscal-years')
  async listFiscalYears(@CurrentUser() user: UserEntity) {
    return this.fiscalYearRepository.find({
      where: { userId: user.id },
      order: { startDate: 'ASC' },
    });
  }

  @Post('fiscal-years')
  async createFiscalYear(
    @CurrentUser() user: UserEntity,
    @Body() dto: CreateFiscalYearDto,
  ) {
    return this.createFiscalYearUseCase.execute(user.id, dto);
  }

  @Post('fiscal-years/:id/close')
  async closeFiscalYear(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const parseResult = CloseFiscalYearRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.message);
    }
    return this.closeFiscalYearUseCase.execute(user.id, id, parseResult.data);
  }

  @Get('periods')
  async listPeriods(
    @CurrentUser() user: UserEntity,
    @Query('fiscalYearId') fiscalYearId?: string,
  ) {
    const query = this.periodRepository
      .createQueryBuilder('period')
      .innerJoin('period.fiscalYear', 'fiscalYear')
      .where('fiscalYear.userId = :userId', { userId: user.id });

    if (fiscalYearId) {
      query.andWhere('period.fiscalYearId = :fiscalYearId', { fiscalYearId });
    }

    return query.orderBy('period.startDate', 'ASC').getMany();
  }

  @Patch('periods/:id')
  async updatePeriod(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const parseResult = UpdatePeriodRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.message);
    }
    return this.updatePeriodUseCase.execute(user.id, id, parseResult.data);
  }
}
