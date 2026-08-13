import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { PeriodEntity } from './period.entity';
import { AccountEntity } from './account.entity';

@Entity('budget_reassignments')
export class BudgetReassignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity | null;

  @Index()
  @Column({ name: 'period_id' })
  periodId: string;

  @ManyToOne(() => PeriodEntity)
  @JoinColumn({ name: 'period_id' })
  period: PeriodEntity;

  @Index()
  @Column({ name: 'source_account_id' })
  sourceAccountId: string;

  @ManyToOne(() => AccountEntity)
  @JoinColumn({ name: 'source_account_id' })
  sourceAccount: AccountEntity;

  @Index()
  @Column({ name: 'target_account_id' })
  targetAccountId: string;

  @ManyToOne(() => AccountEntity)
  @JoinColumn({ name: 'target_account_id' })
  targetAccount: AccountEntity;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
