import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { UserEntity } from './user.entity';
import { PeriodEntity } from './period.entity';

@Entity('fiscal_years')
@Index(['userId', 'name'], { unique: true })
export class FiscalYearEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  name: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'varchar', length: 10, default: 'OPEN' })
  status: 'OPEN' | 'CLOSED';

  @OneToMany(() => PeriodEntity, (period) => period.fiscalYear, { cascade: true, onDelete: 'CASCADE' })
  periods: PeriodEntity[];
}
