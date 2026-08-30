import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PeriodEntity } from '../database/entities/period.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { EnsurePeriodService } from '../../application/periods/ensure-period.service';
import { UpdatePeriodUseCase } from '../../application/periods/update-period.use-case';
import {
  EnsurePeriodRequestSchema,
  UpdatePeriodRequestSchema,
  EnsurePeriodResponse,
  PeriodResponse,
} from '@sistema-contable/shared';

@Controller('api/periods')
@UseGuards(JwtAuthGuard)
export class PeriodController {
  constructor(
    private readonly ensurePeriodService: EnsurePeriodService,
    private readonly updatePeriodUseCase: UpdatePeriodUseCase,
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
  ) {}

  @Get()
  async listPeriods(@CurrentUser() user: UserEntity): Promise<PeriodResponse[]> {
    return this.periodRepository.find({
      where: { userId: user.id },
      order: { startDate: 'ASC' },
    });
  }

  @Post('ensure')
  async ensurePeriod(
    @CurrentUser() user: UserEntity,
    @Body() body: any,
  ): Promise<EnsurePeriodResponse> {
    const parseResult = EnsurePeriodRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.message);
    }
    return this.ensurePeriodService.execute(user.id, parseResult.data);
  }

  @Patch(':id')
  async updatePeriod(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: any,
  ): Promise<PeriodResponse> {
    const parseResult = UpdatePeriodRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.message);
    }
    return this.updatePeriodUseCase.execute(user.id, id, parseResult.data);
  }
}
