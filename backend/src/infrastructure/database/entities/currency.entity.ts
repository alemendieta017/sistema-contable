import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('currencies')
export class CurrencyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column({ name: 'rate_to_base', type: 'decimal', precision: 18, scale: 4, default: 1.0 })
  rateToBase: number;

  @Column({ name: 'is_base', default: false })
  isBase: boolean;

  @Column({ name: 'decimal_places', default: 2 })
  decimalPlaces: number;
}
