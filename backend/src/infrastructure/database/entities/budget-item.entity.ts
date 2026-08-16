import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BudgetEntity } from './budget.entity';
import { AccountEntity } from './account.entity';
import { FlowIntention, CashFlowDirection } from '@sistema-contable/shared';

@Entity('budget_items')
@Index(['budgetId', 'accountId'])
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

  @Column({ type: 'varchar', nullable: true, name: 'sub_row_id' })
  subRowId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'sub_row_label' })
  subRowLabel: string | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => (value !== null && value !== undefined ? parseFloat(value) : 0),
    },
  })
  amount: number;

  @Column({ type: 'varchar', nullable: true, name: 'cash_flow_direction' })
  cashFlowDirection: CashFlowDirection | null;

  @Column({ type: 'varchar', nullable: true, name: 'flow_intention' })
  flowIntention: FlowIntention | null;
}
