import { Controller, Get, Put, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrencyEntity } from '../database/entities/currency.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateRateDto } from './dto/update-rate.dto';

@Controller('api/currencies')
@UseGuards(JwtAuthGuard)
export class CurrencyController {
  constructor(
    @InjectRepository(CurrencyEntity)
    private readonly currencyRepository: Repository<CurrencyEntity>,
  ) {}

  @Get()
  async list() {
    return this.currencyRepository.find({
      order: { code: 'ASC' },
    });
  }

  @Put(':id/rate')
  async updateRate(@Param('id') id: string, @Body() body: UpdateRateDto) {
    const currency = await this.currencyRepository.findOneBy({ id });
    if (!currency) {
      throw new NotFoundException(`Currency with ID ${id} not found`);
    }

    currency.rateToBase = body.rateToBase;
    return this.currencyRepository.save(currency);
  }
}
