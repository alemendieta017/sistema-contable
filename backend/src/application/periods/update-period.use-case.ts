import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { BalanceUpdateService } from './balance-update.service';
import { UpdatePeriodRequest } from '@sistema-contable/shared';
import { IsString, IsIn } from 'class-validator';

export class UpdatePeriodDto implements UpdatePeriodRequest {
  @IsString()
  @IsIn(['OPEN', 'CLOSED', 'PLANNING'])
  status: 'OPEN' | 'CLOSED' | 'PLANNING';
}

@Injectable()
export class UpdatePeriodUseCase {
  constructor(
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
    private readonly balanceUpdateService: BalanceUpdateService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, periodId: string, dto: UpdatePeriodRequest) {
    const status = dto.status;

    return this.dataSource.transaction(async (entityManager) => {
      // 1. Fetch period and its fiscal year to verify ownership
      const period = await entityManager.findOne(PeriodEntity, {
        where: { id: periodId },
        relations: ['fiscalYear'],
      });

      if (!period) {
        throw new NotFoundException(`Period with ID ${periodId} not found`);
      }

      if (period.fiscalYear.userId !== userId) {
        throw new NotFoundException(`Period with ID ${periodId} not found`);
      }

      const oldStatus = period.status;

      if (oldStatus === status) {
        return {
          id: period.id,
          fiscalYearId: period.fiscalYearId,
          name: period.name,
          startDate: period.startDate,
          endDate: period.endDate,
          status: period.status,
        };
      }

      period.status = status;
      const updatedPeriod = await entityManager.save(PeriodEntity, period);

      // If status changes from CLOSED to OPEN, call propagateBalancesFromPeriod
      if (oldStatus === 'CLOSED' && status === 'OPEN') {
        await this.balanceUpdateService.propagateBalancesFromPeriod(
          entityManager,
          userId,
          periodId,
        );
      }

      return {
        id: updatedPeriod.id,
        fiscalYearId: updatedPeriod.fiscalYearId,
        name: updatedPeriod.name,
        startDate: updatedPeriod.startDate,
        endDate: updatedPeriod.endDate,
        status: updatedPeriod.status,
      };
    });
  }
}
