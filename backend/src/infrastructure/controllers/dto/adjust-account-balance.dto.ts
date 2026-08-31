import { IsNumber, IsEnum, IsUUID, IsOptional, IsString } from 'class-validator';
import { AdjustAccountBalanceRequest } from '@sistema-contable/shared';

export class AdjustAccountBalanceDto implements AdjustAccountBalanceRequest {
  @IsNumber()
  targetBalance: number;

  @IsEnum(['CAPITAL', 'CATEGORY'])
  adjustmentType: 'CAPITAL' | 'CATEGORY';

  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @IsString()
  @IsOptional()
  description?: string;
}
