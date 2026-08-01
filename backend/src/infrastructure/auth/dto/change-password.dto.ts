import { IsNotEmpty, Matches } from 'class-validator';
import { PASSWORD_REGEX, PASSWORD_COMPLEXITY_MESSAGE } from '@sistema-contable/shared';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_COMPLEXITY_MESSAGE })
  newPassword: string;
}
