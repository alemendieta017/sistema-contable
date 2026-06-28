import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountEntity } from '../database/entities/account.entity';
import { CurrencyEntity } from '../database/entities/currency.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { GetAccountsSummaryUseCase } from '../../application/accounts/get-accounts-summary.use-case';
import { DeleteAccountUseCase } from '../../application/accounts/delete-account.use-case';

@Controller('api/accounts')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    private readonly getAccountsSummaryUseCase: GetAccountsSummaryUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: UserEntity) {
    return this.accountRepository.find({
      where: { userId: user.id },
      order: { name: 'ASC' },
    });
  }

  @Get('summary')
  async summary(@CurrentUser() user: UserEntity) {
    return this.getAccountsSummaryUseCase.execute(user.id);
  }

  @Post()
  async create(@CurrentUser() user: UserEntity, @Body() body: CreateAccountDto) {
    let currencyId = body.currencyId;
    if (!currencyId || currencyId === '00000000-0000-0000-0000-000000000000') {
      const currencyRepo = this.accountRepository.manager.getRepository(CurrencyEntity);
      const currency = await currencyRepo.findOne({ where: { isBase: true } })
        || await currencyRepo.findOne({ where: {} });
      if (currency) {
        currencyId = currency.id;
      }
    }

    const account = this.accountRepository.create({
      userId: user.id,
      name: body.name,
      type: body.type,
      currencyId,
      parentId: body.parentId,
      metadata: body.metadata,
      status: 'ACTIVE',
    });
    return this.accountRepository.save(account);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    return this.deleteAccountUseCase.execute(user.id, id);
  }
}
