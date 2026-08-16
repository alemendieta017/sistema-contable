import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { UpdateAccountRequest, AccountStatus } from '@sistema-contable/shared';

export class UpdateAccountDto implements UpdateAccountRequest {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isCashOrBank?: boolean;

  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;
}
