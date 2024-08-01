import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';

import { Subscription } from './subscription.entity';

@Entity('payment_log')
export class PaymentLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Subscription, (subscription) => subscription.paymentLogs)
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'jsonb' })
  data: any;
}
