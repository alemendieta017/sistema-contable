import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email: string;
}
