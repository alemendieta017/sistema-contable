import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from './user.entity';
import { CurrencyEntity } from './currency.entity';

@Entity('accounts')
@Index(['userId', 'name'], { unique: true })
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  name: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @ManyToOne(() => AccountEntity)
  @JoinColumn({ name: 'parent_id' })
  parent: AccountEntity;

  @Column({ type: 'varchar', length: 15 })
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

  @Column({ name: 'currency_id' })
  currencyId: string;

  @ManyToOne(() => CurrencyEntity)
  @JoinColumn({ name: 'currency_id' })
  currency: CurrencyEntity;

  @Column({ type: 'varchar', length: 10, default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
