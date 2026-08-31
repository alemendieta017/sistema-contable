import { IsString, IsNotEmpty, IsEnum, IsUUID, IsOptional, IsNumber } from 'class-validator';
import { CreateAccountRequest, AccountType, SystemRole } from '@sistema-contable/shared';

export class CreateAccountDto implements CreateAccountRequest {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'])
  type: AccountType;

  @IsUUID()
  currencyId: string;

  @IsUUID()
  @IsOptional()
  parentId?: string | null;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsEnum(['CAPITAL', 'NET_INCOME', 'RETAINED_EARNINGS'])
  @IsOptional()
  systemRole?: SystemRole | null;

  @IsNumber()
  @IsOptional()
  initialBalance?: number;
}
