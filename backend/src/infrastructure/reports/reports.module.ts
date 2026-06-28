import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalEntryEntity } from '../database/entities/journal-entry.entity';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { GetCategoryStatisticsUseCase } from '../../application/reports/get-category-statistics.use-case';
import { ExportExcelService } from '../../application/reports/export-excel.service';
import { ReportsController } from '../controllers/reports.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JournalEntryEntity, TransactionEntity]),
    AuthModule,
  ],
  providers: [GetCategoryStatisticsUseCase, ExportExcelService],
  controllers: [ReportsController],
  exports: [GetCategoryStatisticsUseCase, ExportExcelService],
})
export class ReportsModule {}
