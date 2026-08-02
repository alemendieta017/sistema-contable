import { IsNotEmpty, Matches } from 'class-validator';
import { PASSWORD_REGEX, PASSWORD_COMPLEXITY_MESSAGE } from '@sistema-contable/shared';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @IsNotEmpty({ message: 'New password is required' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_COMPLEXITY_MESSAGE })
  newPassword: string;
}
