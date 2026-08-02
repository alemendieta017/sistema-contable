import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Multi-Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let user1Token: string;
  let user2Token: string;
  let defaultCurrencyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Register User 1
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Tenant One',
        email: `tenant1_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    user1Token = res1.body.access_token;

    // Register User 2
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Tenant Two',
        email: `tenant2_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    user2Token = res2.body.access_token;

    // Fetch default currency
    const currRes = await request(app.getHttpServer())
      .get('/api/currencies')
      .set('Authorization', `Bearer ${user1Token}`);

    if (currRes.body && currRes.body.length > 0) {
      defaultCurrencyId = currRes.body[0].id;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('User 2 cannot see accounts created by User 1', async () => {
    // User 1 creates an account
    const createRes = await request(app.getHttpServer())
      .post('/api/accounts')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Private Account Tenant 1',
        type: 'ASSET',
        currencyId: defaultCurrencyId,
      });
    expect(createRes.status).toBe(201);
    const accountId = createRes.body.id;

    // User 2 lists accounts
    const listResUser2 = await request(app.getHttpServer())
      .get('/api/accounts')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(listResUser2.status).toBe(200);
    const user2Accounts = listResUser2.body;
    const found = user2Accounts.find((a: any) => a.id === accountId);
    expect(found).toBeUndefined();
  });
});
