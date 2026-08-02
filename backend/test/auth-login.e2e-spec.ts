import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthErrorCode } from '@sistema-contable/shared';
import { AppModule } from '../src/app.module';

describe('Auth Login & Profile (E2E)', () => {
  let app: INestApplication;
  const userEmail = `login_test_${Date.now()}@example.com`;
  const userPassword = 'Password123!';
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Register test user
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Login Test User',
        email: userEmail,
        password: userPassword,
      });

    jwtToken = regRes.body.access_token;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /api/v1/auth/login - authenticates user with valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: userEmail,
        password: userPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(userEmail);
  });

  it('POST /api/v1/auth/login - rejects invalid password with 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: userEmail,
        password: 'WrongPassword999!',
      });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
  });

  it('POST /api/v1/auth/login - rejects non-existent email with 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'nobody_exists@example.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
  });

  it('GET /api/v1/auth/me - retrieves authenticated user profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${jwtToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(userEmail);
    expect(res.body.fullName).toBe('Login Test User');
  });

  it('GET /api/v1/auth/me - rejects unauthenticated request with 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
  });
});
