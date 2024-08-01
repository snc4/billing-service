import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('payment_provider')
@Unique(['name'])
export class PaymentProvider {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'is_default' })
  isDefault: boolean;
}
