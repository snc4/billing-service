import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, Column, OneToMany } from 'typeorm';

import { Customer } from './customer.entity';
import { Product } from './product.entity';
import { PaymentProvider } from './paymentProvider.entity';
import { PaymentLog } from './paymentLog.entity';

@Entity('subscription')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Customer, (customer) => customer.subscriptions)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => PaymentLog, (paymentLog) => paymentLog.subscription)
  paymentLogs: PaymentLog[];

  @OneToOne(() => PaymentProvider)
  @JoinColumn({ name: 'payment_provider_id' })
  paymentProvider: PaymentProvider;

  @Column({ name: 'subscription_id' })
  subscriptionId: string;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'next_billing_at' })
  nextBillingAt?: Date;

  @Column({ name: 'is_canceled' })
  isCanceled?: boolean;
}
