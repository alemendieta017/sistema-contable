import { IsUUID, IsNumber, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { IBudgetUpdateDto, IBudgetUpdateItemDto } from '../../../domain/budgets/budget.model';

export class UpdateBudgetItemDto implements IBudgetUpdateItemDto {
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @IsNumber()
  amount: number;
}

export class UpdateBudgetDto implements IBudgetUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBudgetItemDto)
  items: UpdateBudgetItemDto[];
}
