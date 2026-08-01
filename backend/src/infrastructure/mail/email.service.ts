import { Injectable, Logger } from '@nestjs/common';

export interface SendPasswordResetEmailParams {
  to: string;
  fullName: string;
  resetUrl: string;
}

export abstract class EmailService {
  abstract sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void>;
}

@Injectable()
export class ConsoleEmailService extends EmailService {
  private readonly logger = new Logger(ConsoleEmailService.name);

  async sendPasswordResetEmail({ to, fullName, resetUrl }: SendPasswordResetEmailParams): Promise<void> {
    this.logger.log(`
==================================================
[DEVELOPMENT EMAIL SERVICE]
To: ${fullName} <${to}>
Subject: Restablecer Contraseña - Sistema Contable

Estimado/a ${fullName},

Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:
${resetUrl}

Este enlace expira en 60 minutos. Si no solicitaste este cambio, puedes ignorar este correo.
==================================================
    `);
  }
}
