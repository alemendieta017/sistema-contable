import { IsString, IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class SetBudgetDto {
  @IsUUID()
  accountId: string;

  @IsNumber()
  @IsPositive()
  limit: number;

  @IsString()
  @IsNotEmpty()
  period: string; // Format: 'YYYY-MM'
}
