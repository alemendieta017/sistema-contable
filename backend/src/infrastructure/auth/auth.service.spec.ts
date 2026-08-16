import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { UserEntity } from '../database/entities/user.entity';
import { PasswordResetTokenEntity } from '../database/entities/password-reset-token.entity';
import { AccountEntity } from '../database/entities/account.entity';
import { CurrencyEntity } from '../database/entities/currency.entity';
import { EmailService } from '../mail/email.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let tokenRepository: any;
  let dataSource: any;
  let mockManager: any;
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

    mockManager = {
      create: jest.fn((entityClass, dto) => {
        if (entityClass === UserEntity) {
          return { ...dto, id: 'user-uuid', createdAt: new Date() };
        }
        return { ...dto, id: 'acc-uuid' };
      }),
      save: jest.fn((entityClass, entityOrEntities) => Promise.resolve(entityOrEntities)),
      findOne: jest.fn((entityClass) => {
        if (entityClass === CurrencyEntity) {
          return Promise.resolve({ id: 'currency-uuid', code: 'PYG', isBase: true });
        }
        return Promise.resolve(null);
      }),
    };

    dataSource = {
      transaction: jest.fn(async (cb) => cb(mockManager)),
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
        { provide: DataSource, useValue: dataSource },
        { provide: JwtService, useValue: jwtService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user successfully, create system accounts and return JWT token', async () => {
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

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockManager.save).toHaveBeenCalledWith(
        AccountEntity,
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-uuid',
            name: 'Resultado del Ejercicio',
            type: 'EQUITY',
            systemRole: 'NET_INCOME',
          }),
          expect.objectContaining({
            userId: 'user-uuid',
            name: 'Resultados Acumulados',
            type: 'EQUITY',
            systemRole: 'RETAINED_EARNINGS',
          }),
        ]),
      );
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

    it('should throw InternalServerErrorException if no currency is configured', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.register({
          fullName: 'Juan Pérez',
          email: 'juan@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(InternalServerErrorException);
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
