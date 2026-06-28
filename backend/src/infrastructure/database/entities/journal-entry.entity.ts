import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TransactionEntity } from './transaction.entity';
import { AccountEntity } from './account.entity';

@Entity('journal_entries')
export class JournalEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @ManyToOne(() => TransactionEntity, (tx) => tx.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: TransactionEntity;

  @Column({ name: 'account_id' })
  accountId: string;

  @ManyToOne(() => AccountEntity)
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;

  @Column({ name: 'entry_type', type: 'varchar', length: 6 })
  entryType: 'DEBIT' | 'CREDIT';

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  amount: number;

  @Column({ name: 'amount_base', type: 'decimal', precision: 18, scale: 4 })
  amountBase: number;

  @Column({ name: 'rate_at_date', type: 'decimal', precision: 18, scale: 4, default: 1.0 })
  rateAtDate: number;
}
