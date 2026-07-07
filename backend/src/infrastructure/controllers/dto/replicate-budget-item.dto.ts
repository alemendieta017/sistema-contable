import { IsUUID, IsNumber, IsNotEmpty } from 'class-validator';
import { IBudgetReplicateDto } from '../../../domain/budgets/budget.model';

export class ReplicateBudgetItemDto implements IBudgetReplicateDto {
  @IsUUID()
  @IsNotEmpty()
  periodId: string;

  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @IsNumber()
  amount: number;
}
