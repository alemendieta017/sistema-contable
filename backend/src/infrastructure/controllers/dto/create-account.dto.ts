import { IsString, IsNotEmpty, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { CreateAccountRequest, AccountType } from '@sistema-contable/shared';

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
}
