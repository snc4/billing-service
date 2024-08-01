import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, MoreThan } from 'typeorm';

import { Subscription } from 'src/db/entities/subscription.entity';
import { Customer } from 'src/db/entities/customer.entity';
import { PaymentProvider } from 'src/db/entities/paymentProvider.entity';

import { SubscriptionData } from 'src/payment/types/payment.types';

@Injectable()
export default class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {}

  async getCustomerActiveSubscription(customer: Customer): Promise<Subscription | null> {
    const currentDate = new Date();
    return await this.subscriptionRepository.findOne({
      where: {
        customer,
        subscriptionId: Not(IsNull()),
        nextBillingAt: MoreThan(currentDate),
      },
      order: {
        nextBillingAt: 'DESC',
      },
      relations: ['product'],
    });
  }

  async createOrUpdate(subscriptionData: SubscriptionData): Promise<Subscription> {
    const isSubscription = !!subscriptionData.subscriptionId;
    let subscription;

    // 1. если прилетел евент покупки подписки - то проверяем существует ли у нас в бд эта "покупка"
    if (isSubscription) {
      subscription = await this.subscriptionRepository.findOne({
        where: {
          paymentProvider: subscriptionData.paymentProvider,
          subscriptionId: subscriptionData.subscriptionId,
        },
        relations: ['customer', 'product'],
      });

      // 2. если подписка есть в бд - то обновляем дату следующего платежа
      if (subscription) {
        subscription.nextBillingAt = subscriptionData.nextBillingAt;
        return subscription;
      }
    }

    // 3. если это разовая покупка или такой подписки не нашлось - то создаем новую "покупку"
    subscription = this.subscriptionRepository.create(subscriptionData);
    subscription.createdAt = new Date();
    return subscription;
  }

  async save(subscription: Subscription): Promise<void> {
    await this.subscriptionRepository.save(subscription);
  }

  async findBySubscriptionId(subscriptionId: string, paymentProvider: PaymentProvider): Promise<Subscription | null> {
    return await this.subscriptionRepository.findOne({
      where: {
        paymentProvider,
        subscriptionId,
      },
      relations: ['customer', 'product'],
    });
  }

  async cancelSubscription(subscription: Subscription): Promise<void> {
    await this.subscriptionRepository.update({ id: subscription.id }, { isCanceled: true });
  }

  async resumeSubscription(subscription: Subscription): Promise<void> {
    await this.subscriptionRepository.update({ id: subscription.id }, { isCanceled: false });
  }

  async deactivateSubscription(subscriptionId: string, paymentProvider: PaymentProvider): Promise<Subscription | null> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { paymentProvider, subscriptionId },
        relations: ['customer'],
      });

      if (!subscription) {
        throw new Error(`subscription with id: ${subscriptionId} not found!`);
      }

      // подписка считается активной если дата следующего списания средств > текущей даты
      // поэтому для деактивации перезапишем дату следующего платежа на текущую
      await this.subscriptionRepository.update({ id: subscription.id }, { nextBillingAt: new Date() });
      return subscription;
    } catch (error) {
      // TODO notify
      return null;
    }
  }
}
