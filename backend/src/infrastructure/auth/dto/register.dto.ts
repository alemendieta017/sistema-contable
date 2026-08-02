import { IsEmail, IsNotEmpty, Matches, Length } from 'class-validator';
import { PASSWORD_REGEX, PASSWORD_COMPLEXITY_MESSAGE } from '@sistema-contable/shared';

export class RegisterDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @Length(2, 100, { message: 'Full name must be between 2 and 100 characters' })
  fullName: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_COMPLEXITY_MESSAGE })
  password: string;
}
