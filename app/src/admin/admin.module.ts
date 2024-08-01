import { Module } from '@nestjs/common';

import { CustomerModule } from 'src/customer/customer.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { PaymentLogModule } from 'src/paymentLog/paymentLog.module';
import { PaymentProviderModule } from 'src/paymentProvider/paymentProvider.module';

import { AdminController } from './admin.controller';

import { AdminService } from './admin.service';

@Module({
  imports: [PaymentLogModule, SubscriptionModule, CustomerModule, PaymentProviderModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
