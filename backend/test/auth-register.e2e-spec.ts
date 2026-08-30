import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthErrorCode } from '@sistema-contable/shared';
import { AppModule } from '../src/app.module';

describe('Auth Register (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /api/v1/auth/register - successfully registers a new user, creates system accounts and returns JWT token', async () => {
    const email = `testuser_${Date.now()}@example.com`;
    const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Jane Doe',
      email,
      password: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.fullName).toBe('Jane Doe');
    expect(res.body.user.email).toBe(email);

    const token = res.body.access_token;

    // Verify system accounts were created for the newly registered user
    const accRes = await request(app.getHttpServer())
      .get('/api/accounts')
      .set('Authorization', `Bearer ${token}`);

    expect(accRes.status).toBe(200);
    expect(Array.isArray(accRes.body)).toBe(true);

    const capitalAcc = accRes.body.find((a: any) => a.systemRole === 'CAPITAL');

    expect(capitalAcc).toBeDefined();
    expect(capitalAcc.name).toBe('Capital');
    expect(capitalAcc.type).toBe('EQUITY');
  });

  it('POST /api/v1/auth/register - rejects duplicate email registration with 409 Conflict', async () => {
    const email = `dupuser_${Date.now()}@example.com`;

    // First registration
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'First User',
      email,
      password: 'Password123!',
    });

    // Duplicate registration attempt
    const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Second User',
      email,
      password: 'Password123!',
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe(AuthErrorCode.EMAIL_ALREADY_EXISTS);
  });

  it('POST /api/v1/auth/register - rejects registration with simple/invalid password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Weak Pass User',
        email: `weakpass_${Date.now()}@example.com`,
        password: '123',
      });

    expect(res.status).toBe(400);
  });
});
