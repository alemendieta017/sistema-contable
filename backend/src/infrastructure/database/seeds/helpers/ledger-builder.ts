import { EntityManager } from 'typeorm';
import { TransactionEntity } from '../../entities/transaction.entity';
import { JournalEntryEntity } from '../../entities/journal-entry.entity';

export class LedgerBuilder {
  constructor(
    private readonly em: EntityManager,
    private readonly userId: string,
  ) {}

  async createTransaction(data: {
    description: string;
    date: Date;
    entries: { accountId: string; debit: number; credit: number }[];
  }) {
    const totalDebit = data.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = data.entries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new Error(
        `Transacción desbalanceada: "${data.description}". Total Débito: ${totalDebit}, Total Crédito: ${totalCredit}`
      );
    }

    // 1. Crear transacción base
    const transaction = this.em.create(TransactionEntity, {
      userId: this.userId,
      description: data.description,
      date: data.date,
      status: 'POSTED',
    });
    const savedTx = await this.em.save(TransactionEntity, transaction);

    // 2. Crear líneas de diario
    const journalEntries: JournalEntryEntity[] = [];
    for (const entry of data.entries) {
      const isDebit = entry.debit > 0;
      const amount = isDebit ? entry.debit : entry.credit;

      const journalEntry = this.em.create(JournalEntryEntity, {
        transactionId: savedTx.id,
        accountId: entry.accountId,
        entryType: isDebit ? 'DEBIT' : 'CREDIT',
        amount,
        amountBase: amount, // Asumimos tasa de cambio 1.0 para moneda base
        rateAtDate: 1.0,
      });
      journalEntries.push(journalEntry);
    }

    const savedEntries = await this.em.save(JournalEntryEntity, journalEntries);
    savedTx.entries = savedEntries;
    return savedTx;
  }
}
