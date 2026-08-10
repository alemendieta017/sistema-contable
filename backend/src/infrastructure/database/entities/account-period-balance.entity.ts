import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';
import { AccountEntity } from './account.entity';
import { PeriodEntity } from './period.entity';

export class ColumnNumericTransformer {
  to(data: number | null): number | null {
    return data;
  }
  from(data: string | number | null): number {
    if (data === null || data === undefined) return 0;
    return typeof data === 'number' ? data : parseFloat(data);
  }
}

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

  @Column({
    name: 'opening_balance',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0.0,
    transformer: new ColumnNumericTransformer(),
  })
  openingBalance: number;

  @Column({
    name: 'total_debits',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0.0,
    transformer: new ColumnNumericTransformer(),
  })
  totalDebits: number;

  @Column({
    name: 'total_credits',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0.0,
    transformer: new ColumnNumericTransformer(),
  })
  totalCredits: number;

  @Column({
    name: 'closing_balance',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0.0,
    transformer: new ColumnNumericTransformer(),
  })
  closingBalance: number;

  @UpdateDateColumn({ name: 'last_updated', type: 'timestamp with time zone' })
  lastUpdated: Date;
}
