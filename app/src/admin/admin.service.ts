import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { GetUserInfoRequestDto } from './dto/getUserInfoRequest.dto';
import { GetUserInfoResponseDto } from './dto/getUserInfoResponse.dto';

import CustomerService from 'src/customer/customer.service';
import PaymentProviderService from 'src/paymentProvider/paymentProvider.service';

import { Subscription } from 'src/db/entities/subscription.entity';

import { CurrentPlan } from 'src/customer/customer.types';
import { SupportedPaymentSystems } from 'src/payment/paymentSystem/paymentSystem.config';

@Injectable()
export class AdminService {
  constructor(
    private readonly customerService: CustomerService,
    private readonly paymentProviderService: PaymentProviderService
  ) {}

  async getUserInfo(query: GetUserInfoRequestDto): Promise<GetUserInfoResponseDto | []> {
    const { uid } = query;

    if (!uid) {
      throw new HttpException('no search criteria passed', HttpStatus.BAD_REQUEST);
    }

    try {
      const customerExtended = await this.customerService.getExistingByUidExtended(uid);
      const lastActiveSubscription = customerExtended.subscriptions
        .filter((sub) => sub.nextBillingAt && sub.nextBillingAt > new Date())
        .sort((a: Subscription, b: Subscription) => b.createdAt.getTime() - a.createdAt.getTime());
      const currentPlan: CurrentPlan = {
        isActive: lastActiveSubscription.length > 0,
        planInfo: {
          productCode: lastActiveSubscription[0]?.product?.productCode,
          nextChargeDate: lastActiveSubscription[0]?.nextBillingAt,
          managementUrl: 'stub',
        },
        options: lastActiveSubscription[0]?.product?.options,
      };

      return {
        customer: customerExtended,
        currentPlan,
      };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async setDefaultPaymentProvider(providerName: SupportedPaymentSystems): Promise<void> {
    const paymentProvider = await this.paymentProviderService.getByName(providerName);
    await this.paymentProviderService.setDefault(paymentProvider);
  }
}
