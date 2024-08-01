import { Injectable } from '@nestjs/common';
import { MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import DataSource from 'src/db/typeorm.config';
import { Executable } from './executable.interface';
import { Subscription } from 'src/db/entities/subscription.entity';

@Injectable()
export class SendActiveSubs implements Executable {
  constructor(private readonly configService: ConfigService) {}

  async run() {
    await DataSource.initialize();

    const currentDate = new Date();
    const batchSize = 100;
    let processed = 0;
    let offset = 0;
    const errorIds: number[] = [];

    const activeSubscriptionsCount = await this.getActiveSubscriptionsCount(currentDate);
    let subscriptions: Subscription[] = await this.getActiveSubscriptionsBatch(offset, batchSize, currentDate);

    console.log(`Found ${activeSubscriptionsCount} active users`);

    while (subscriptions.length > 0) {
      for (const sub of subscriptions) {
        try {
          await this.sendEventToAggregator({
            eventName: 'sub',
            uid: sub.customer.uid,
            data: {
              firstPurchaseDate: sub.createdAt,
            },
          });
          processed += 1;
        } catch (error) {
          console.log(error);
          errorIds.push(sub.id);
        }
      }

      offset += batchSize;
      subscriptions = await this.getActiveSubscriptionsBatch(offset, batchSize, currentDate);
    }

    console.log(`Processed ${processed} users`);
    console.log(`Error subscription IDs: ${errorIds.join(', ')}`);

    await DataSource.destroy();
  }

  private async getActiveSubscriptionsBatch(offset: number, batchSize: number, currentDate: Date): Promise<Subscription[]> {
    return await DataSource.getRepository(Subscription).find({
      where: {
        nextBillingAt: MoreThan(currentDate),
      },
      skip: offset,
      take: batchSize,
      relations: ['customer', 'product'],
    });
  }

  private async getActiveSubscriptionsCount(currentDate: Date): Promise<number> {
    return await DataSource.getRepository(Subscription).count({
      where: { nextBillingAt: MoreThan(currentDate) },
    });
  }

  private async sendEventToAggregator(event: AggregatorEvent): Promise<void> {
    const response = await fetch('http://some-aggregator/events/register-event', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'x-internal-secret': 'secret',
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.log(await response.json());
      throw new Error(`Failed to send task for user: uid - ${event.uid}`);
    }
  }
}
