import { IsNumber, IsPositive } from 'class-validator';

export class UpdateRateDto {
  @IsNumber()
  @IsPositive()
  rateToBase: number;
}
