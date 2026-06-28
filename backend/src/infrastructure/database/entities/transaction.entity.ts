import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { JournalEntryEntity } from './journal-entry.entity';

@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'timestamp with time zone' })
  date: Date;

  @Column()
  description: string;

  @Column({ type: 'varchar', length: 10, default: 'POSTED' })
  status: 'POSTED' | 'REVERSED';

  @Column({ name: 'reversal_of_id', nullable: true })
  reversalOfId: string;

  @ManyToOne(() => TransactionEntity)
  @JoinColumn({ name: 'reversal_of_id' })
  reversalOf: TransactionEntity;

  @OneToMany(() => JournalEntryEntity, (entry) => entry.transaction)
  entries: JournalEntryEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
