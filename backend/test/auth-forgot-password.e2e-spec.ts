import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthErrorCode } from '@sistema-contable/shared';
import { AppModule } from '../src/app.module';
import { PasswordResetTokenEntity } from '../src/infrastructure/database/entities/password-reset-token.entity';

describe('Auth Forgot & Reset Password (E2E)', () => {
  let app: INestApplication;
  let tokenRepo: Repository<PasswordResetTokenEntity>;

  const userEmail = `forgot_pass_${Date.now()}@example.com`;
  const initialPassword = 'InitialPassword123!';
  const resetPassword = 'ResetPassword456!';
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    tokenRepo = moduleFixture.get<Repository<PasswordResetTokenEntity>>(
      getRepositoryToken(PasswordResetTokenEntity),
    );

    // Register user
    const regRes = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Forgot Password User',
      email: userEmail,
      password: initialPassword,
    });

    userId = regRes.body.user.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /api/v1/auth/forgot-password - returns generic acknowledgment for existing email', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: userEmail });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();

    // Verify token was stored in database for user
    const tokenRecord = await tokenRepo.findOne({ where: { userId } });
    expect(tokenRecord).toBeDefined();
    expect(tokenRecord?.used).toBe(false);
  });

  it('POST /api/v1/auth/forgot-password - returns generic acknowledgment for non-existent email', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent_account@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('POST /api/v1/auth/reset-password - rejects invalid or fake token with 400', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/reset-password').send({
      token: 'invalid-token-12345',
      newPassword: resetPassword,
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(AuthErrorCode.EXPIRED_OR_INVALID_TOKEN);
  });

  it('POST /api/v1/auth/reset-password - successfully resets password with valid token', async () => {
    // Generate request
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: userEmail });

    // Retrieve latest token record from db
    const tokens = await tokenRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    const latestToken = tokens[0];

    // For E2E test, we simulate user resetting using token string matching hashed token
    // We update token record to predictable hash
    const rawToken = 'valid-test-token-uuid-123';
    const crypto = await import('crypto');
    latestToken.tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await tokenRepo.save(latestToken);

    // Perform reset
    const resetRes = await request(app.getHttpServer()).post('/api/v1/auth/reset-password').send({
      token: rawToken,
      newPassword: resetPassword,
    });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toContain('Password reset successfully');

    // Login with reset password
    const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: userEmail,
      password: resetPassword,
    });

    expect(loginRes.status).toBe(200);
  });
});
