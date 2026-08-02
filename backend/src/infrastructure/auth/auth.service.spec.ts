import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserEntity } from '../database/entities/user.entity';
import { PasswordResetTokenEntity } from '../database/entities/password-reset-token.entity';
import { EmailService } from '../mail/email.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let tokenRepository: any;
  let jwtService: any;
  let emailService: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'user-uuid', createdAt: new Date() })),
      save: jest.fn((user) => Promise.resolve({ ...user, id: 'user-uuid', createdAt: new Date() })),
    };

    tokenRepository = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'token-uuid' })),
      save: jest.fn((token) => Promise.resolve(token)),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    emailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        { provide: getRepositoryToken(PasswordResetTokenEntity), useValue: tokenRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user successfully and return JWT token', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.register({
        fullName: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result.user).toEqual({
        id: 'user-uuid',
        fullName: 'Juan Pérez',
        email: 'juan@example.com',
        createdAt: expect.any(String),
      });
    });

    it('should throw ConflictException if email is already registered', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'existing-id', email: 'juan@example.com' });

      await expect(
        service.register({
          fullName: 'Juan Pérez',
          email: 'juan@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
