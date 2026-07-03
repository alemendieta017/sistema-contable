import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, UpdateDateColumn } from 'typeorm';
import { AccountEntity } from './account.entity';
import { PeriodEntity } from './period.entity';

@Entity('account_period_balances')
@Index(['accountId', 'periodId'], { unique: true })
export class AccountPeriodBalanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id' })
  accountId: string;

  @ManyToOne(() => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;

  @Column({ name: 'period_id' })
  periodId: string;

  @ManyToOne(() => PeriodEntity, (period) => period.balances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'period_id' })
  period: PeriodEntity;

  @Column({ name: 'opening_balance', type: 'decimal', precision: 18, scale: 4, default: 0.0000 })
  openingBalance: number;

  @Column({ name: 'total_debits', type: 'decimal', precision: 18, scale: 4, default: 0.0000 })
  totalDebits: number;

  @Column({ name: 'total_credits', type: 'decimal', precision: 18, scale: 4, default: 0.0000 })
  totalCredits: number;

  @Column({ name: 'closing_balance', type: 'decimal', precision: 18, scale: 4, default: 0.0000 })
  closingBalance: number;

  @UpdateDateColumn({ name: 'last_updated', type: 'timestamp with time zone' })
  lastUpdated: Date;
}
