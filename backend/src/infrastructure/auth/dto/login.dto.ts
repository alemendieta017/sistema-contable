import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { LoginRequest } from '@sistema-contable/shared';

export class LoginDto implements LoginRequest {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
