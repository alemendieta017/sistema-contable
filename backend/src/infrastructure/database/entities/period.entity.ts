import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { AccountPeriodBalanceEntity } from './account-period-balance.entity';
import { BudgetEntity } from './budget.entity';

@Entity('periods')
@Index(['userId', 'name'], { unique: true })
@Index(['userId', 'startDate'])
export class PeriodEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ length: 7 })
  name: string; // e.g. "2026-08"

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'varchar', length: 10, default: 'OPEN' })
  status: 'OPEN' | 'CLOSED' | 'PLANNING';

  @OneToMany(() => AccountPeriodBalanceEntity, (balance) => balance.period, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  balances: AccountPeriodBalanceEntity[];

  @OneToOne(() => BudgetEntity, (budget) => budget.periodEntity)
  budget?: BudgetEntity;
}
