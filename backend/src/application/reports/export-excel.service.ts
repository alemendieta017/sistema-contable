import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExportExcelService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
  ) {}

  async execute(userId: string): Promise<any> {
    const transactions = await this.transactionRepository.find({
      where: { userId },
      relations: ['entries', 'entries.account', 'entries.account.currency'],
      order: { date: 'DESC' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registros');

    // Define columns matching RealByte Registro Contable export format
    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Cuenta', key: 'cuenta', width: 15 },
      { header: 'Categoría', key: 'categoria', width: 15 },
      { header: 'Subcategorías', key: 'subcategoria', width: 15 },
      { header: 'Nota', key: 'nota', width: 25 },
      { header: 'PYG', key: 'pyg', width: 10 },
      { header: 'Ingreso/Gasto', key: 'tipo', width: 15 },
      { header: 'Descripción', key: 'descripcion', width: 25 },
      { header: 'Importe', key: 'importe', width: 15 },
      { header: 'Moneda', key: 'moneda', width: 10 },
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };

    for (const tx of transactions) {
      // Find asset/liability account and income/expense category in the splits
      const assetEntry = tx.entries.find(
        (e) => e.account.type === 'ASSET' || e.account.type === 'LIABILITY',
      );
      const categoryEntry = tx.entries.find(
        (e) => e.account.type === 'INCOME' || e.account.type === 'EXPENSE',
      );

      // Determine transaction type
      let typeStr = 'Transferencia';
      if (categoryEntry) {
        typeStr = categoryEntry.account.type === 'INCOME' ? 'Ingreso' : 'Gasto';
      }

      const rowValue = {
        fecha: tx.date.toISOString().substring(0, 10),
        cuenta: assetEntry?.account?.name || '',
        categoria: categoryEntry?.account?.name || '',
        subcategoria: '',
        nota: tx.description,
        pyg: categoryEntry ? 'Sí' : 'No',
        tipo: typeStr,
        descripcion: tx.description,
        importe: Number(tx.entries[0]?.amount || 0.0),
        moneda: assetEntry?.account?.currency?.code || 'ARS',
      };

      worksheet.addRow(rowValue);
    }

    return workbook.xlsx.writeBuffer() as any;
  }
}
