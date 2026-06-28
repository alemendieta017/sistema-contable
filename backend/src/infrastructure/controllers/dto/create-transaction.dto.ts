import { IsString, IsNotEmpty, IsArray, ValidateNested, IsEnum, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTransactionRequest, JournalEntryRequest } from '@sistema-contable/shared';

export class JournalEntryDto implements JournalEntryRequest {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsEnum(['DEBIT', 'CREDIT'])
  entryType: 'DEBIT' | 'CREDIT';

  @IsNumber()
  @IsPositive()
  amount: number;
}

export class CreateTransactionDto implements CreateTransactionRequest {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryDto)
  entries: JournalEntryDto[];
}
