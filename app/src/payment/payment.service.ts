import { Injectable, ForbiddenException } from '@nestjs/common';

import CustomerService from 'src/customer/customer.service';
import ProductService from 'src/product/product.service';
import { StripeService } from './paymentSystem/stripe/stripe.service';
import { PaddleService } from './paymentSystem/paddle/paddle.service';
import PaymentProviderService from 'src/paymentProvider/paymentProvider.service';

import PaymentPageRequestDto from './dto/paymentPageRequest.dto';
import { StripeEvent, PaddleEvent, PaymentPageRedirectResponse, PaymentPageRenderResponse } from './types/payment.types';
import { PaymentSystem } from './types/paymentSystem.interface';

@Injectable()
export class PaymentService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly paddleService: PaddleService,
    private readonly customerService: CustomerService,
    private readonly productService: ProductService,
    private readonly paymentProviderService: PaymentProviderService
  ) {}

  async getDefaultPaymentSystem(): Promise<PaymentSystem<StripeEvent | PaddleEvent>> {
    const defaultProvider = await this.paymentProviderService.getDefault();

    switch (defaultProvider.name) {
      case this.stripeService.name:
        return this.stripeService;
      case this.paddleService.name:
        return this.paddleService;
      default:
        throw new Error(`No service for provider: ${defaultProvider.name}`);
    }
  }

  async redirectToPaymentPage(paymentParams: {
    paymentPageRequestDto: PaymentPageRequestDto;
    paymentSystem: PaymentSystem<StripeEvent | PaddleEvent>;
  }): Promise<PaymentPageRedirectResponse | PaymentPageRenderResponse> {
    const { paymentPageRequestDto, paymentSystem } = paymentParams;

    const customer = await this.customerService.getOrCreate(paymentPageRequestDto.uid);
    const product = await this.productService.getProductByCode(paymentPageRequestDto.productCode);
    const { isActive } = await this.customerService.getCurrentPlan(customer);

    if (isActive) {
      throw new ForbiddenException('Already subscribed');
    }

    return paymentSystem.getPaymentPage(
      customer,
      product,
      { trialDays: parseInt(paymentPageRequestDto.trialDays, 10) },
    );
  }
}
