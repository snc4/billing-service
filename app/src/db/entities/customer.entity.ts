import { Entity, Column, PrimaryGeneratedColumn, Unique, OneToMany } from 'typeorm';
import { Subscription } from './subscription.entity';

export type AdditionalData = {
  // ...
};

@Entity('customer')
@Unique(['uid'])
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  uid: string;

  @Column({ name: 'additional_data', type: 'jsonb', nullable: true })
  additionalData: AdditionalData;

  @OneToMany(() => Subscription, (subscription) => subscription.customer)
  subscriptions: Subscription[];
}
