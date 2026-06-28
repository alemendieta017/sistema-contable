import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CurrencyEntity } from '../../src/infrastructure/database/entities/currency.entity';
import { CurrencyController } from '../../src/infrastructure/controllers/currency.controller';
import { JwtAuthGuard } from '../../src/infrastructure/auth/jwt-auth.guard';

describe('Currency Endpoints Contract Tests', () => {
  let app: INestApplication;

  const mockCurrencyRepo = {
    find: jest.fn().mockResolvedValue([
      { id: 'cur-pyg', code: 'PYG', name: 'Guaraní', symbol: '₲', rateToBase: 1.0, isBase: true },
      { id: 'cur-usd', code: 'USD', name: 'Dólar', symbol: 'u$s', rateToBase: 7500.0, isBase: false },
    ]),
    findOneBy: jest.fn().mockImplementation(({ id }) => Promise.resolve({
      id,
      code: 'USD',
      name: 'Dólar',
      symbol: 'u$s',
      rateToBase: 7500.0,
      isBase: false,
    })),
    save: jest.fn().mockImplementation((obj) => Promise.resolve({ ...obj })),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CurrencyController],
      providers: [
        {
          provide: getRepositoryToken(CurrencyEntity),
          useValue: mockCurrencyRepo,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true }) // Auto-authorize
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/currencies', () => {
    it('should return list of currencies', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/currencies')
        .expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].code).toBe('PYG');
    });
  });

  describe('PUT /api/currencies/:id/rate', () => {
    it('should update currency rate', async () => {
      await request(app.getHttpServer())
        .put('/api/currencies/cur-usd/rate')
        .send({ rateToBase: 8000.0 })
        .expect(200);
      expect(mockCurrencyRepo.save).toHaveBeenCalled();
    });

    it('should throw 400 if rateToBase is invalid', async () => {
      await request(app.getHttpServer())
        .put('/api/currencies/cur-usd/rate')
        .send({ rateToBase: -50 })
        .expect(400);
    });
  });
});
