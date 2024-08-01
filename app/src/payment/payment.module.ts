import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SubscriptionModule } from 'src/subscription/subscription.module';
import { ProductModule } from 'src/product/product.module';
import { PaymentLogModule } from 'src/paymentLog/paymentLog.module';
import { CustomerModule } from 'src/customer/customer.module';
import { PaymentProviderModule } from 'src/paymentProvider/paymentProvider.module';

import { PaymentService } from './payment.service';
import { StripeService } from './paymentSystem/stripe/stripe.service';
import { PaddleService } from './paymentSystem/paddle/paddle.service';
import PaymentProviderService from 'src/paymentProvider/paymentProvider.service';

import { PaymentController } from './payment.controller';
import { StripeController } from './paymentSystem/stripe/stripe.controller';
import { PaddleController } from './paymentSystem/paddle/paddle.controller';

import { Subscription } from 'src/db/entities/subscription.entity';
import { AnalyticsModule } from 'src/analytics/analytics.module';

@Module({
  imports: [
    CustomerModule,
    SubscriptionModule,
    ProductModule,
    PaymentLogModule,
    PaymentProviderModule,
    ConfigModule,
    TypeOrmModule.forFeature([Subscription]),
    AnalyticsModule,
  ],
  controllers: [PaymentController, StripeController, PaddleController],
  providers: [PaymentService, StripeService, PaddleService, PaymentProviderService],
})
export class PaymentModule {}
