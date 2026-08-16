import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { FactoryResetDto, DeleteAccountDto } from './dto/danger-zone.dto';
import { FactoryResetUseCase } from '../../application/danger-zone/factory-reset.use-case';
import { DeleteUserAccountUseCase } from '../../application/danger-zone/delete-account.use-case';
import { DangerZoneResponse } from '@sistema-contable/shared';

@Controller(['api/v1/danger-zone', 'api/danger-zone'])
@UseGuards(JwtAuthGuard)
export class DangerZoneController {
  constructor(
    private readonly factoryResetUseCase: FactoryResetUseCase,
    private readonly deleteAccountUseCase: DeleteUserAccountUseCase,
  ) {}

  @Post('reset-data')
  async resetData(
    @CurrentUser() user: UserEntity,
    @Body() dto: FactoryResetDto,
  ): Promise<DangerZoneResponse> {
    return this.factoryResetUseCase.execute(user, dto);
  }

  @Post('delete-account')
  async deleteAccount(
    @CurrentUser() user: UserEntity,
    @Body() dto: DeleteAccountDto,
  ): Promise<DangerZoneResponse> {
    return this.deleteAccountUseCase.execute(user, dto);
  }
}
