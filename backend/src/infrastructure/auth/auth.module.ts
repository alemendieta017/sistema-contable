import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserEntity } from '../database/entities/user.entity';
import { PasswordResetTokenEntity } from '../database/entities/password-reset-token.entity';
import { AccountEntity } from '../database/entities/account.entity';
import { CurrencyEntity } from '../database/entities/currency.entity';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from '../controllers/auth.controller';
import { EmailService, ConsoleEmailService } from '../mail/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, PasswordResetTokenEntity, AccountEntity, CurrencyEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret && process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET environment variable must be set in production mode');
        }
        return {
          secret: secret || 'supersecretjwtkey1234!',
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: EmailService,
      useClass: ConsoleEmailService,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtStrategy, PassportModule, EmailService],
})
export class AuthModule {}
