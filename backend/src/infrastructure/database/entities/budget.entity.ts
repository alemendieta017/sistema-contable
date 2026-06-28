import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from './user.entity';
import { AccountEntity } from './account.entity';

@Entity('budgets')
@Index(['userId', 'accountId', 'period'], { unique: true })
export class BudgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'account_id' })
  accountId: string;

  @ManyToOne(() => AccountEntity)
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  limit: number;

  @Column({ type: 'varchar', length: 7 }) // Format: 'YYYY-MM' (e.g. '2026-06')
  period: string;
}
