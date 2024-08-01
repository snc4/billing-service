import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

import { PaymentProvider } from 'src/db/entities/paymentProvider.entity';

@Injectable()
export default class PaymentProviderService {
  constructor(
    @InjectRepository(PaymentProvider)
    private paymentProviderRepository: Repository<PaymentProvider>
  ) {}

  async getByName(name: string): Promise<PaymentProvider> {
    const paymentProvider = await this.paymentProviderRepository.findOne({ where: { name } });

    if (!paymentProvider) {
      throw new Error(`Payment provider with name: ${name} not exist in db!`);
    }

    return paymentProvider;
  }

  async getDefault(): Promise<PaymentProvider> {
    const paymentProvider = await this.paymentProviderRepository.findOne({ where: { isDefault: true } });

    if (!paymentProvider) {
      throw new Error('No default payment provider in db!');
    }

    return paymentProvider;
  }

  async setDefault(paymentProvider: PaymentProvider): Promise<void> {
    await this.paymentProviderRepository.update({ id: Not(paymentProvider.id) }, { isDefault: false });
    await this.paymentProviderRepository.update({ id: paymentProvider.id }, { isDefault: true });
  }
}
