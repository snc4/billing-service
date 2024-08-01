import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentLog } from 'src/db/entities/paymentLog.entity';

import PaymentLogService from './paymentLog.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentLog])],
  providers: [PaymentLogService],
  exports: [TypeOrmModule, PaymentLogService],
})
export class PaymentLogModule {}
