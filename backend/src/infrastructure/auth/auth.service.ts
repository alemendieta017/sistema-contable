import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserEntity } from '../database/entities/user.entity';
import { PasswordResetTokenEntity } from '../database/entities/password-reset-token.entity';
import { EmailService } from '../mail/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthErrorCode } from '@sistema-contable/shared';

const DUMMY_HASH = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly tokenRepository: Repository<PasswordResetTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException({
        code: AuthErrorCode.EMAIL_ALREADY_EXISTS,
        message: 'Email already registered',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = this.userRepository.create({
      fullName: dto.fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      isActive: true,
    });

    const saved = await this.userRepository.save(user);

    const payload = { sub: saved.id, email: saved.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: saved.id,
        fullName: saved.fullName,
        email: saved.email,
        createdAt: saved.createdAt?.toISOString(),
      },
    };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({ where: { email: normalizedEmail } });
    const hashToCompare = user ? user.passwordHash : DUMMY_HASH;

    const isMatch = await bcrypt.compare(dto.password, hashToCompare);

    if (!user || !isMatch) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        createdAt: user.createdAt?.toISOString(),
      },
    };
  }

  async getProfile(user: UserEntity) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt?.toISOString(),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_CURRENT_PASSWORD,
        message: 'Current password verification failed',
      });
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password cannot be identical to current password');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(dto.newPassword, salt);
    await this.userRepository.save(user);

    return {
      message: 'Password updated successfully',
    };
  }

  async requestForgotPassword(dto: ForgotPasswordDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({ where: { email: normalizedEmail } });

    if (user) {
      const rawToken = crypto.randomUUID();
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

      const tokenRecord = this.tokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        used: false,
      });

      await this.tokenRepository.save(tokenRecord);

      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

      await this.emailService.sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        resetUrl,
      });
    }

    return {
      message: 'If the email is registered, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    const tokenRecord = await this.tokenRepository.findOne({
      where: { tokenHash, used: false },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException({
        code: AuthErrorCode.EXPIRED_OR_INVALID_TOKEN,
        message: 'Invalid or expired password reset token',
      });
    }

    const user = await this.userRepository.findOne({ where: { id: tokenRecord.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.tokenRepository.manager.transaction(async (transactionalEntityManager) => {
      // Mark current token as used
      tokenRecord.used = true;
      await transactionalEntityManager.save(tokenRecord);

      // Update user password
      user.passwordHash = passwordHash;
      await transactionalEntityManager.save(user);

      // Invalidate any other active reset tokens for this user
      await transactionalEntityManager.update(
        PasswordResetTokenEntity,
        { userId: user.id, used: false },
        { used: true },
      );
    });

    return {
      message: 'Password reset successfully. You may now log in with your new password.',
    };
  }
}
