import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserEntity } from '../database/entities/user.entity';
import { PasswordResetTokenEntity } from '../database/entities/password-reset-token.entity';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from '../controllers/auth.controller';
import { EmailService, ConsoleEmailService } from '../mail/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, PasswordResetTokenEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretjwtkey1234!',
      signOptions: { expiresIn: '7d' },
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
