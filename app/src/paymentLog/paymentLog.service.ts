import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Subscription } from 'src/db/entities/subscription.entity';
import { PaymentLog } from 'src/db/entities/paymentLog.entity';

@Injectable()
export default class PaymentLogService {
  constructor(
    @InjectRepository(PaymentLog)
    private paymentLogRepository: Repository<PaymentLog>
  ) {}

  async logPayment(subscription: Subscription, data: any) {
    const paymentEvent = new PaymentLog();
    paymentEvent.subscription = subscription;
    paymentEvent.data = data;
    await this.paymentLogRepository.save(paymentEvent);
  }

  async isExistPaymentLog(subscription: Subscription, data: any): Promise<boolean> {
    const existingPaymentLog = await this.paymentLogRepository.findOne({
      where: { subscription, data },
    });
    return !!existingPaymentLog;
  }
}
