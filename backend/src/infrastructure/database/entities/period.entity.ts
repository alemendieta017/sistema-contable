import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { FiscalYearEntity } from './fiscal-year.entity';
import { AccountPeriodBalanceEntity } from './account-period-balance.entity';

@Entity('periods')
@Index(['fiscalYearId', 'name'], { unique: true })
export class PeriodEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'fiscal_year_id' })
  fiscalYearId: string;

  @ManyToOne(() => FiscalYearEntity, (fiscalYear) => fiscalYear.periods, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fiscal_year_id' })
  fiscalYear: FiscalYearEntity;

  @Column()
  name: string; // e.g. "2026-03"

  @Column({ name: 'start_date', type: 'timestamp with time zone' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp with time zone' })
  endDate: Date;

  @Column({ type: 'varchar', length: 10, default: 'OPEN' })
  status: 'OPEN' | 'CLOSED';

  @OneToMany(() => AccountPeriodBalanceEntity, (balance) => balance.period, { cascade: true, onDelete: 'CASCADE' })
  balances: AccountPeriodBalanceEntity[];
}
