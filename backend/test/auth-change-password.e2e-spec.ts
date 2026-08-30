import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthErrorCode } from '@sistema-contable/shared';
import { AppModule } from '../src/app.module';

describe('Auth Change Password (E2E)', () => {
  let app: INestApplication;
  const userEmail = `change_pass_${Date.now()}@example.com`;
  const oldPassword = 'OldPassword123!';
  const newPassword = 'NewPassword456!';
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Register user
    const regRes = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Change Pass User',
      email: userEmail,
      password: oldPassword,
    });

    jwtToken = regRes.body.access_token;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /api/v1/auth/change-password - rejects invalid current password with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        currentPassword: 'WrongCurrentPassword9!',
        newPassword,
      });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(AuthErrorCode.INVALID_CURRENT_PASSWORD);
  });

  it('POST /api/v1/auth/change-password - successfully updates password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        currentPassword: oldPassword,
        newPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Password updated');

    // Login with old password fails
    const oldLoginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: userEmail,
      password: oldPassword,
    });
    expect(oldLoginRes.status).toBe(401);

    // Login with new password succeeds
    const newLoginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: userEmail,
      password: newPassword,
    });
    expect(newLoginRes.status).toBe(200);
  });

  it('POST /api/v1/auth/change-password - rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/change-password').send({
      currentPassword: newPassword,
      newPassword: 'AnotherPassword789!',
    });

    expect(res.status).toBe(401);
  });
});
