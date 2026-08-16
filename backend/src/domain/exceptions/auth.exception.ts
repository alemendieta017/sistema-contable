import { UnauthorizedException } from '@nestjs/common';
import { AuthErrorCode } from '@sistema-contable/shared';

export class InvalidCurrentPasswordException extends UnauthorizedException {
  constructor(message = 'Contraseña actual incorrecta') {
    super({
      statusCode: 401,
      error: 'Unauthorized',
      code: AuthErrorCode.INVALID_CURRENT_PASSWORD,
      message,
    });
  }
}

export { AuthErrorCode };
