import { EntityManager } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import { CurrencyEntity } from '../../entities/currency.entity';
import * as bcrypt from 'bcrypt';

export async function baseScenario(
  em: EntityManager,
): Promise<{ user: UserEntity; baseCurrency: CurrencyEntity }> {
  // 1. Sembrar monedas por defecto (PYG y USD)
  let pyg = await em.findOne(CurrencyEntity, { where: { code: 'PYG' } });
  if (!pyg) {
    pyg = em.create(CurrencyEntity, {
      code: 'PYG',
      name: 'Guaraní Paraguayo',
      symbol: '₲',
      rateToBase: 1.0,
      isBase: true,
      decimalPlaces: 0,
    });
    pyg = await em.save(CurrencyEntity, pyg);
    console.log('[SEED] Moneda PYG sembrada.');
  }

  let usd = await em.findOne(CurrencyEntity, { where: { code: 'USD' } });
  if (!usd) {
    usd = em.create(CurrencyEntity, {
      code: 'USD',
      name: 'Dólar Estadounidense',
      symbol: 'u$s',
      rateToBase: 7500.0,
      isBase: false,
      decimalPlaces: 2,
    });
    await em.save(CurrencyEntity, usd);
    console.log('[SEED] Moneda USD sembrada.');
  }

  // 2. Sembrar usuario de pruebas
  const email = 'test@sistema.com';
  let user = await em.findOne(UserEntity, { where: { email } });
  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    user = em.create(UserEntity, {
      email,
      passwordHash,
    });
    user = await em.save(UserEntity, user);
    console.log(`[SEED] Usuario de pruebas creado: ${email} con contraseña "password123"`);
  }

  return { user, baseCurrency: pyg };
}
