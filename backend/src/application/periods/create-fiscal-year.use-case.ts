import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FiscalYearEntity } from '../../infrastructure/database/entities/fiscal-year.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { CreateFiscalYearRequest } from '@sistema-contable/shared';
import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class CreateFiscalYearDto implements CreateFiscalYearRequest {
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;
}

@Injectable()
export class CreateFiscalYearUseCase {
  constructor(
    @InjectRepository(FiscalYearEntity)
    private readonly fiscalYearRepository: Repository<FiscalYearEntity>,
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, dto: CreateFiscalYearRequest) {
    const name = `Ejercicio ${dto.year}`;
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // 1. Validate that the start date is before end date
    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // 2. Check for duplicate name for this user
    const existingByName = await this.fiscalYearRepository.findOne({
      where: { userId, name },
    });
    if (existingByName) {
      throw new BadRequestException(`Fiscal year with name "${name}" already exists`);
    }

    // 3. Check for overlapping dates for this user
    const overlapping = await this.fiscalYearRepository
      .createQueryBuilder('fy')
      .where('fy.userId = :userId', { userId })
      .andWhere('fy.startDate < :endDate', { endDate })
      .andWhere('fy.endDate > :startDate', { startDate })
      .getOne();

    if (overlapping) {
      throw new BadRequestException(
        `Fiscal year dates overlap with existing fiscal year "${overlapping.name}"`,
      );
    }

    // 4. Save Fiscal Year and 12 monthly periods in a transaction
    return this.dataSource.transaction(async (entityManager) => {
      const fyEntity = entityManager.create(FiscalYearEntity, {
        userId,
        name,
        startDate,
        endDate,
        status: 'OPEN',
      });

      const savedFy = await entityManager.save(FiscalYearEntity, fyEntity);

      const periods: PeriodEntity[] = [];
      const offsetMs = startDate.getTime() - Date.UTC(dto.year, 0, 1, 0, 0, 0, 0);

      for (let i = 0; i < 12; i++) {
        // Calculate start and end date for each period in UTC with offset
        const pStart = new Date(Date.UTC(dto.year, i, 1, 0, 0, 0, 0) + offsetMs);
        const pEnd = new Date(Date.UTC(dto.year, i + 1, 0, 23, 59, 59, 999) + offsetMs);

        const periodName = `${dto.year}-${String(i + 1).padStart(2, '0')}`;

        const periodEntity = entityManager.create(PeriodEntity, {
          fiscalYearId: savedFy.id,
          name: periodName,
          startDate: pStart,
          endDate: pEnd,
          status: 'OPEN',
        });

        const savedPeriod = await entityManager.save(PeriodEntity, periodEntity);
        periods.push(savedPeriod);
      }

      return {
        id: savedFy.id,
        name: savedFy.name,
        startDate: savedFy.startDate,
        endDate: savedFy.endDate,
        status: savedFy.status,
        periods: periods.map((p) => ({
          id: p.id,
          name: p.name,
          startDate: p.startDate,
          endDate: p.endDate,
          status: p.status,
        })),
      };
    });
  }
}
