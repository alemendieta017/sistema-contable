import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { AccountEntity } from '../database/entities/account.entity';
import { CurrencyEntity } from '../database/entities/currency.entity';
import * as bcrypt from 'bcrypt';
import { LoginRequest } from '@sistema-contable/shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(body: LoginRequest) {
    const existing = await this.userRepository.findOne({ where: { email: body.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(body.password, salt);

    const user = this.userRepository.create({
      email: body.email,
      passwordHash,
    });

    const saved = await this.userRepository.save(user);

    // Seed default accounts for user convenience
    const currencyRepo = this.userRepository.manager.getRepository(CurrencyEntity);
    const currency = await currencyRepo.findOne({ where: { isBase: true } })
       || await currencyRepo.findOne({ where: {} });
    const currencyId = currency ? currency.id : '00000000-0000-0000-0000-000000000000';

    const defaultAccounts = [
      { name: 'Efectivo', type: 'ASSET' },
      { name: 'Cuenta Bancaria', type: 'ASSET' },
      { name: 'Tarjeta de Crédito', type: 'LIABILITY' },
      { name: 'Capital Inicial', type: 'EQUITY' },
      { name: 'Sueldo', type: 'INCOME' },
      { name: 'Otros Ingresos', type: 'INCOME' },
      { name: 'Comida', type: 'EXPENSE' },
      { name: 'Transporte', type: 'EXPENSE' },
      { name: 'Servicios', type: 'EXPENSE' },
      { name: 'Ropa', type: 'EXPENSE' },
    ];

    for (const acc of defaultAccounts) {
      const account = this.userRepository.manager.create(AccountEntity, {
        userId: saved.id,
        name: acc.name,
        type: acc.type as any,
        currencyId,
        status: 'ACTIVE',
      });
      await this.userRepository.manager.save(AccountEntity, account);
    }

    return {
      id: saved.id,
      email: saved.email,
      created_at: saved.createdAt,
    };
  }

  async login(body: LoginRequest) {
    const user = await this.userRepository.findOne({ where: { email: body.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(body.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
