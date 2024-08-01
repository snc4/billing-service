import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Subscription } from 'src/db/entities/subscription.entity';

import { PaymentProviderModule } from 'src/paymentProvider/paymentProvider.module';

import SubscriptionService from './subscription.service';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription]), PaymentProviderModule],
  providers: [SubscriptionService],
  exports: [TypeOrmModule, SubscriptionService],
})
export class SubscriptionModule {}
