import { Injectable, Logger, RawBodyRequest, Request } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Paddle,
  Environment,
  Product as PaddleProduct,
  EventEntity,
  AdjustmentStatus,
  AdjustmentAction,
  TransactionOrigin,
} from '@paddle/paddle-node-sdk';

import { paddleSecrets } from 'src/local.config';
import { PaddleEvent, PaymentPageRenderResponse, SubscriptionData, Metadata, AnalyticsParams } from 'src/payment/types/payment.types';
import { PaymentSystem } from 'src/payment/types/paymentSystem.interface';
import { SupportedPaymentSystems } from '../paymentSystem.config';
import { DEFAULT_CURRENCY } from 'src/common/analytics.config';
import { centsToUSD } from 'src/common/utils';

import { Customer } from 'src/db/entities/customer.entity';
import { Product } from 'src/db/entities/product.entity';
import { PaymentProvider } from 'src/db/entities/paymentProvider.entity';

import { AnalyticsService } from 'src/analytics/analytics.service';
import CustomerService from 'src/customer/customer.service';
import ProductService from 'src/product/product.service';
import PaymentProviderService from 'src/paymentProvider/paymentProvider.service';
import SubscriptionService from 'src/subscription/subscription.service';
import PaymentLogService from 'src/paymentLog/paymentLog.service';

const PADDLE_PRODUCTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

@Injectable()
export class PaddleService implements PaymentSystem<PaddleEvent> {
  name = SupportedPaymentSystems.PADDLE;

  private paddle: Paddle;

  private paymentProvider: PaymentProvider;

  private cachedPaddleProducts: PaddleProduct[] = [];

  private productsLastFetchTime = 0;

  private readonly logger = new Logger(PaddleService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly analyticsService: AnalyticsService,
    private readonly customerService: CustomerService,
    private readonly productService: ProductService,
    private readonly paymentProviderService: PaymentProviderService,
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentLogService: PaymentLogService
  ) {
    this.paddle = new Paddle(paddleSecrets.apiKey, {
      environment: this.getEnvironment(),
    });
  }

  async getPaymentPage(
    customer: Customer,
    product: Product,
    metadata: Metadata,
  ): Promise<PaymentPageRenderResponse> {
    const paddleProduct = await this.getPaddleProductByProductCode(product.productCode);

    if (!paddleProduct) {
      throw new Error(`Product with code: ${product.productCode} not found in Paddle`);
    }

    if (!paddleProduct.prices) {
      throw new Error(`Prices for product: ${product.productCode} not found in Paddle`);
    }

    return {
      metadata: {
        uid: customer.uid,
        productCode: product.productCode,
      },
      config: {
        env: this.getEnvironment(),
        token: paddleSecrets.frontendToken,
        priceId: paddleProduct.prices[0].id,
      },
    };
  }

  getEvent(req: RawBodyRequest<Request | any>): EventEntity | null {
    const signature = req.headers['paddle-signature'] || '';

    if (!req.rawBody) {
      throw new Error('Request from paddle missing raw body!');
    }

    return this.paddle.webhooks.unmarshal(req.rawBody.toString(), paddleSecrets.secretKey, signature);
  }

  async parseDataToRefund(
    event: PaddleEvent
  ): Promise<{ subscriptionId: string; invoiceId: string; refundedValue: number; reason?: string }> {
    const { transactionId, subscriptionId, totals, reason } = event.data;
    const transaction = await this.paddle.transactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Cannot find paddle transaction: ${transactionId}`);
    }

    return {
      subscriptionId,
      invoiceId: transaction.invoiceNumber || '',
      refundedValue: Number(centsToUSD(totals.total)),
      reason,
    };
  }

  async prepareSubscriptionData(event: PaddleEvent): Promise<SubscriptionData> {
    const { data } = event;
    const customer = await this.customerService.getExistingByUid(data.customData.uid);
    const product = await this.productService.getProductByCode(data.customData.product_code);

    return {
      customer,
      product,
      paymentProvider: await this.getPaymentProvider(),
      subscriptionId: data.subscriptionId,
      nextBillingAt: data.billingPeriod.endsAt,
    };
  }

  // https://developer.paddle.com/webhooks/transactions/transaction-completed
  async handleTransactionCompleted(event: PaddleEvent): Promise<void> {
    // subscription_recurring - Transaction created automatically by Paddle as a result of a subscription renewal.
    // web - Transaction created automatically by Paddle.js for a checkout.
    const eventOrigin = event.data.origin as TransactionOrigin;
    const isAutorenew = eventOrigin === 'subscription_recurring';

    const subscriptionData = await this.prepareSubscriptionData(event);
    const subscription = await this.subscriptionService.createOrUpdate(subscriptionData);
    await this.subscriptionService.save(subscription);

    const promoCode = await this.getPromoCode(event.data.discountId);
    const { customData } = event.data;
    const value = centsToUSD(event.data.details.totals.grandTotal);

    await this.sendToAnalytics({
      uid: subscription.customer.uid,
      subscriptionId: subscription.subscriptionId || '',
      isAuto: isAutorenew,
      product: subscription.product,
      value,
      metadata: customData,
      promoCode,
      invoiceId: event.data.invoiceNumber,
      expirationDate: event.data.billingPeriod.endsAt,
    });

    await this.paymentLogService.logPayment(subscription, event);

    this.logger.log(
      `${event.eventType}: uid: ${subscription.customer.uid}, productCode: ${subscription.product.productCode}, subId: ${subscription.subscriptionId}, isAuto: ${isAutorenew}`
    );
  }

  async handleRefund(event: PaddleEvent): Promise<void> {
    if ((event.data.action as AdjustmentAction) !== 'refund') {
      return;
    }

    if ((event.data.status as AdjustmentStatus) !== 'approved') {
      return;
    }

    const { subscriptionId, invoiceId, refundedValue } = await this.parseDataToRefund(event);
    const deactivatedSubscription = await this.subscriptionService.deactivateSubscription(
      subscriptionId,
      this.paymentProvider
    );

    if (deactivatedSubscription) {
      await this.analyticsService.refundEvent(
        deactivatedSubscription.customer.uid,
        subscriptionId,
        invoiceId,
        refundedValue,
        DEFAULT_CURRENCY
      );
    }
  }

  async sendToAnalytics(analyticsParams: AnalyticsParams): Promise<void> {
    const { uid, product, value, metadata, subscriptionId, isAuto, promoCode, invoiceId, expirationDate } =
      analyticsParams;

    await this.analyticsService.purchaseEvent({
      subscriptionId,
      isAuto,
      uid,
      value,
      productCode: product.productCode,
      productTitle: product.name,
      promoCode,
      invoiceId,
      expirationDate,
    });
  }

  async handleSubscriptionCancellation(webhookData: PaddleEvent): Promise<void> {
    const subscriptionId = webhookData.data.id;
    const subscription = await this.subscriptionService.findBySubscriptionId(
      subscriptionId,
      await this.getPaymentProvider()
    );

    if (!subscription) {
      throw new Error(`Paddle subscription: ${subscriptionId} not found in database!`);
    }

    await this.analyticsService.cancelEvent(
      subscription.customer.uid,
      subscriptionId,
      subscription.nextBillingAt
    );
  }

  private getEnvironment(): Environment {
    return this.configService.get('NODE_ENV') === 'production' ? Environment.production : Environment.sandbox;
  }

  private async getPaddleProducts(): Promise<PaddleProduct[]> {
    if (this.cachedPaddleProducts.length && Date.now() - this.productsLastFetchTime < PADDLE_PRODUCTS_CACHE_TTL) {
      return this.cachedPaddleProducts;
    }

    const products: PaddleProduct[] = [];
    const productsCollection = this.paddle.products.list({ status: ['active'], include: ['prices'] });

    while (productsCollection.hasMore) {
      const productsPage = await productsCollection.next();
      for (const product of productsPage) {
        products.push(product);
      }
    }

    this.cachedPaddleProducts = products;
    this.productsLastFetchTime = Date.now();
    return products;
  }

  private async getPaddleProductByProductCode(productCode: string): Promise<PaddleProduct | undefined> {
    const products = await this.getPaddleProducts();
    return products.find((product) => {
      const customData: any = product.customData;
      if (customData && customData.product_code === productCode) {
        return product;
      }
    });
  }

  private async getPromoCode(discountId: string | null): Promise<string | null> {
    if (!discountId) return null;

    const discount = await this.paddle.discounts.get(discountId);

    if (discount) return discount.code;

    return null;
  }

  private async getPaymentProvider(): Promise<PaymentProvider> {
    if (!this.paymentProvider) {
      this.paymentProvider = await this.paymentProviderService.getByName(this.name);
    }

    return this.paymentProvider;
  }
}
