import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { AccountEntity } from './account.entity';
import { PeriodEntity } from './period.entity';
import { BudgetItemEntity } from './budget-item.entity';

@Entity('budgets')
export class BudgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'period_id', unique: true })
  periodId: string;

  @OneToOne(() => PeriodEntity, (period) => period.budget, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'period_id' })
  periodEntity: PeriodEntity;

  @Column({ type: 'varchar' })
  name: string;

  @OneToMany(() => BudgetItemEntity, (item) => item.budget, { cascade: true })
  items: BudgetItemEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // --- Deprecated fields for backward compatibility during refactoring phase ---
  @Column({ name: 'account_id', nullable: true })
  accountId?: string;

  @ManyToOne(() => AccountEntity, { nullable: true })
  @JoinColumn({ name: 'account_id' })
  account?: AccountEntity;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  limit?: number;

  @Column({ type: 'varchar', length: 7, nullable: true })
  period?: string;
}
