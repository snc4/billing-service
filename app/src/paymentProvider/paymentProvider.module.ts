import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentProvider } from 'src/db/entities/paymentProvider.entity';

import PaymentProviderService from './paymentProvider.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentProvider])],
  providers: [PaymentProviderService],
  exports: [TypeOrmModule, PaymentProviderService],
})
export class PaymentProviderModule {}
