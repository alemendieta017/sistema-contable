import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BudgetEntity } from './budget.entity';
import { AccountEntity } from './account.entity';
import { FlowIntention } from '@sistema-contable/shared';

@Entity('budget_items')
@Index(['budgetId', 'accountId'], { unique: true })
export class BudgetItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'budget_id' })
  budgetId: string;

  @ManyToOne(() => BudgetEntity, (budget) => budget.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget: BudgetEntity;

  @Column({ name: 'account_id' })
  accountId: string;

  @ManyToOne(() => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  amount: number;

  @Column({ type: 'varchar', nullable: true, name: 'flow_intention' })
  flowIntention: FlowIntention | null;
}
