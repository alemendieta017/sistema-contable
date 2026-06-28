import { Controller, Get, Post, Body, UseGuards, Query, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { CreateTransactionUseCase } from '../../application/ledger/create-transaction.use-case';
import { ReverseTransactionUseCase } from '../../application/ledger/reverse-transaction.use-case';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('api/transactions')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly reverseTransactionUseCase: ReverseTransactionUseCase,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: UserEntity,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const query = this.transactionRepository
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.entries', 'entry')
      .leftJoinAndSelect('entry.account', 'account')
      .where('tx.userId = :userId', { userId: user.id });

    if (startDate) {
      query.andWhere('tx.date >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('tx.date <= :endDate', { endDate });
    }

    return query.orderBy('tx.date', 'DESC').getMany();
  }

  @Post()
  async create(@CurrentUser() user: UserEntity, @Body() body: CreateTransactionDto) {
    return this.createTransactionUseCase.execute(user.id, body);
  }

  @Post(':id/reverse')
  async reverse(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    return this.reverseTransactionUseCase.execute(user.id, id);
  }
}
