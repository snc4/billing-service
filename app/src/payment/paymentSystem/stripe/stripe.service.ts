import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import {
  convertUnixTimestampToDate,
  convertDateToUnixTimestamp,
} from 'src/common/common.utils';

import { stripeSecrets } from 'src/local.config';
import { SupportedPaymentSystems } from '../paymentSystem.config';
import { PaymentSystem } from 'src/payment/types/paymentSystem.interface';
import { PaymentPageRedirectResponse, SubscriptionData, Metadata, AnalyticsParams } from 'src/payment/types/payment.types';
import { STRIPE_WEBHOOK_SECRETS } from './stripe.WebhookSecrets';

import { Customer } from 'src/db/entities/customer.entity';
import { Product } from 'src/db/entities/product.entity';
import { PaymentProvider } from 'src/db/entities/paymentProvider.entity';
import { Subscription } from 'src/db/entities/subscription.entity';

import SubscriptionService from 'src/subscription/subscription.service';
import PaymentProviderService from 'src/paymentProvider/paymentProvider.service';
import PaymentLogService from 'src/paymentLog/paymentLog.service';
import CustomerService from 'src/customer/customer.service';
import ProductService from 'src/product/product.service';
import { AnalyticsService } from 'src/analytics/analytics.service';

enum SubscriptionStatuses {
  Incomplete = 'incomplete',
  IncompleteExpired = 'incomplete_expired',
  Trialing = 'trialing',
  Active = 'active',
  PastDue = 'past_due',
  Canceled = 'canceled',
}

@Injectable()
export class StripeService implements PaymentSystem<StripeEvent> {
  name = SupportedPaymentSystems.STRIPE;

  private stripe: Stripe;

  private readonly logger = new Logger(StripeService.name);

  private paymentProvider: PaymentProvider;

  /** используется только в dev/test окружении */
  private testWebhooks: Map<string, any[]> = new Map<string, any[]>();

  constructor(
    private readonly configService: ConfigService,
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentProviderService: PaymentProviderService,
    private readonly paymentLogService: PaymentLogService,
    private readonly customerService: CustomerService,
    private readonly productService: ProductService,
    private readonly analyticsService: AnalyticsService,
  ) {
    this.stripe = new Stripe(stripeSecrets.apiKey, {
      apiVersion: '2023-10-16',
    });
  }

  async getPaymentPage(
    customer: Customer,
    product: Product,
    metadata: Metadata,
    userIp: string,
    ua: string,
    fbc: string,
    fbp: string
  ): Promise<PaymentPageRedirectResponse> {
    const stripeProducts = await this.stripe.products.search({
      query: `metadata['product_code']:'${product.productCode}'`,
      expand: ['data.default_price'],
      limit: 1,
    });
    const [stripeProduct] = stripeProducts.data;

    if (!stripeProduct) {
      throw new Error(`Product with code: ${product.productCode} not found in Stripe`);
    }

    const stripePrice = stripeProduct.default_price as Stripe.Price;
    const value = metadata.trialDays ? '0' : centsToUSD(stripePrice.unit_amount);

    const domain = this.configService.get('SITE_ADDRESS');

    const session = await this.stripe.checkout.sessions.create({
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      ...(metadata.trialDays && { subscription_data: { trial_period_days: metadata.trialDays } }),
      mode: 'subscription',
      success_url: `${domain}/successful-payment?value=${value}&trackingId=${trackingId}&productCode=${product.productCode}`,
      cancel_url: `${domain}/account`,
      automatic_tax: { enabled: true },
      client_reference_id: customer.uid,
      allow_promotion_codes: true,
      metadata: {
        productCode: product.productCode,
      },
    });

    if (!session.url) {
      throw new Error(`[stripe] failed to get session url for uid: ${customer.uid}, product: ${product.productCode}`);
    }

    return { url: session.url, statusCode: 302 };
  }

  async getEvent(req: RawBodyRequest): Promise<Stripe.Event> {
    const signature = req.headers['stripe-signature'] || null;

    if (!req.rawBody || !signature) {
      throw new Error('Bad request rawBody or signature is empty');
    }

    try {
      const event = await this.stripe.webhooks.constructEventAsync(
        req.rawBody,
        signature,
        this.getWebhookSecret(req.body.type)
      );
      return event;
    } catch (err) {
      throw new Error(err);
    }
  }

  async parseDataToRefund(
    webhookData: StripeEvent
  ): Promise<{ subscriptionId: string; invoiceId: string; refundedValue: number }> {
    try {
      const charge = webhookData.data.object as Stripe.Charge;
      const invoiceId = charge.invoice as string;
      const invoice = await this.stripe.invoices.retrieve(invoiceId);

      return {
        subscriptionId: invoice.subscription as string,
        invoiceId,
        refundedValue: Number(centsToUSD(charge.amount_refunded)),
      };
    } catch (error) {
      throw new Error('Cannot retrieve invoice');
    }
  }

  async prepareSubscriptionData(webhookData: StripeEvent): Promise<SubscriptionData> {
    const checkoutSession = webhookData.data.object;
    let customer: Customer;

    if (checkoutSession.client_reference_id) {
      customer = await this.customerService.getExistingByUid(checkoutSession.client_reference_id);
    } else {
      customer = await this.customerService.getOrCreate(
        getNoUidEmailIdentificator(checkoutSession.customer_details.email)
      );
    }

    const product = await this.productService.getProductByCode(checkoutSession.metadata.productCode);

    return {
      customer,
      product,
      paymentProvider: await this.getPaymentProvider(),
      subscriptionId: checkoutSession.subscription,
    };
  }

  async handleCheckoutSessionCompleted(req: RawBodyRequest): Promise<void> {
    const event = (await this.getEvent(req)) as StripeEvent;
    const subscriptionData = await this.prepareSubscriptionData(event);
    const subscription = await this.subscriptionService.createOrUpdate(subscriptionData);
    await this.subscriptionService.save(subscription);

    const { promoCode } = await this.getCheckoutSessionPromoInfo(event.data.object as Stripe.Checkout.Session);
    const metadata = event.data.object.metadata;
    const value = centsToUSD(event.data.object.amount_total);
    const originalPrice = Number(centsToUSD(event.data.object.amount_subtotal));
    const discount = Number(centsToUSD(event.data.object.total_details.amount_discount));
    const fee = await this.getFee(event.data.object.invoice);

    const stripeSubscription = await this.retrieveSubscription(event.data.object.subscription);

    await this.sendToAnalytics({
      uid: subscription.customer.uid,
      subscriptionId: subscription.subscriptionId,
      isAuto: false,
      product: subscription.product,
      value,
      originalPrice,
      metadata,
      promoCode,
      discount,
      invoiceId: event.data.object.invoice,
      expirationDate: convertUnixTimestampToDate(stripeSubscription.current_period_end),
      fee,
    });

    this.logger.log(
      `${event.type}: uid: ${subscription.customer.uid}, productCode: ${subscription.product.productCode}, subId: ${subscription.subscriptionId}`
    );
  }

  async handleCustomerSubscriptionUpdated(req: RawBodyRequest): Promise<void> {
    const event = (await this.getEvent(req)) as StripeEvent;

    const subscription: any = event.data.object;

    if (subscription.cancel_at_period_end === true) {
      await this.handleSubscriptionCancellation(event);
      return;
    }

    // when the payment succeeds - subscription status moves to 'active'
    // we do nothing because the payment is not successful
    if (subscription.status !== SubscriptionStatuses.Active) {
      return;
    }

    const existingSubscription = await this.subscriptionService.findBySubscriptionId(
      subscription.id,
      await this.getPaymentProvider()
    );

    // handle resume subscription
    if (existingSubscription.nextBillingAt && existingSubscription.isCanceled) {
      await this.subscriptionService.resumeSubscription(existingSubscription);
      await this.analyticsService.resumeEvent(
        existingSubscription.customer.uid,
        existingSubscription.subscriptionId,
        convertUnixTimestampToDate(subscription.current_period_end)
      );
      return;
    }

    if (await this.paymentLogService.isExistPaymentLog(existingSubscription, subscription)) {
      this.logger.warn(
        `received request has already been processed! uid: ${existingSubscription.customer.uid} | sub_id: ${subscription.id}`
      );
      return;
    }

    await this.finalizePayment(existingSubscription, subscription);

    this.logger.log(
      `${event.type}: uid: ${existingSubscription.customer.uid}, productCode: ${existingSubscription.product.productCode}, subId: ${existingSubscription.subscriptionId}`
    );
  }

  async handleCustomerSubscriptionDeleted(req: RawBodyRequest): Promise<void> {
    const event = (await this.getEvent(req)) as StripeEvent;
    const subscription: any = event.data.object;

    const existingSubscription = await this.subscriptionService.findBySubscriptionId(
      subscription.id,
      await this.getPaymentProvider()
    );

    if (!existingSubscription) {
      throw new Error(`deleted subscription with id ${subscription.id} not found in database!`);
    }

    await this.subscriptionService.cancelSubscription(existingSubscription);
    await this.subscriptionService.deactivateSubscription(subscription.id, this.paymentProvider);

    await this.analyticsService.deleteEvent(existingSubscription.customer.uid, subscription.id);
  }

  async handleChargeRefunded(req: RawBodyRequest): Promise<void> {
    const event = (await this.getEvent(req)) as StripeEvent;
    const { subscriptionId, invoiceId, refundedValue } = await this.parseDataToRefund(event);

    const subscription = await this.subscriptionService.findBySubscriptionId(
      subscriptionId,
      await this.getPaymentProvider()
    );

    if (subscription) {
      await this.analyticsService.refundEvent(
        subscription.customer.uid,
        subscriptionId,
        invoiceId,
        refundedValue,
      );
    }
  }

  async handleRefundUpdated(req: RawBodyRequest): Promise<void> {
    const event = (await this.getEvent(req)) as StripeEvent;
    const refund = event.data.object as Stripe.Refund;
    const charge = await this.stripe.charges.retrieve(refund.charge as string, { expand: ['invoice'] });

    if (!charge) {
      throw new Error(`Charge ${refund.charge} not found in Stripe`);
    }

    const invoice: any = charge.invoice;
    if (!invoice) {
      throw new Error(`Charge ${refund.charge} doesnt have invoice`);
    }

    const subscription = await this.subscriptionService.findBySubscriptionId(
      invoice.subscription as string,
      await this.getPaymentProvider()
    );

    if (!subscription) {
      throw new Error(`Subscription: ${invoice.subscription} not found in database`);
    }

    const where = {
      subscription_id: {
        equals: subscription.subscriptionId || '',
      },
    };
    const newFields = { reason: refund.reason };

    await this.analyticsService.modifyEvent('refund', subscription.customer.uid, where, newFields);
  }

  async handleInvoicePaid(req: RawBodyRequest): Promise<void> {
    const event = (await this.getEvent(req)) as StripeEvent;
    const invoice = event.data.object as Stripe.Invoice;

    if (invoice.billing_reason !== 'subscription_cycle') {
      return;
    }

    const subscription = await this.subscriptionService.findBySubscriptionId(
      invoice.subscription as string,
      await this.getPaymentProvider()
    );

    if (!subscription) {
      throw new Error(`Subscription: ${invoice.subscription} not found in database`);
    }

    const fee = await this.getFee(invoice);

    await this.sendToAnalytics({
      uid: subscription.customer.uid,
      subscriptionId: subscription.subscriptionId || '',
      isAuto: true,
      product: subscription.product,
      value: centsToUSD(invoice.amount_paid),
      metadata: subscription.customer.additionalData,
      invoiceId: invoice.id,
      expirationDate: subscription.nextBillingAt,
      fee,
    });

    this.logger.log(
      `${event.type}: uid: ${subscription.customer.uid}, productCode: ${subscription.product.productCode}, subId: ${subscription.subscriptionId}`
    );
  }

  async sendToAnalytics(analyticsParams: AnalyticsParams): Promise<void> {
    const {
      uid,
      product,
      value,
      metadata,
      subscriptionId,
      isAuto,
      promoCode,
      discount,
      invoiceId,
      expirationDate,
      fee,
      originalPrice,
    } = analyticsParams;

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
      fee,
    });
  }

  async handleSubscriptionCancellation(webhookData: StripeEvent): Promise<void> {
    const stripeSubscription: any = webhookData.data.object;
    const { reason, comment, feedback } = stripeSubscription.cancellation_details;

    const subscription = await this.subscriptionService.findBySubscriptionId(
      stripeSubscription.id,
      await this.getPaymentProvider()
    );

    if (!subscription) {
      throw new Error(`Stripe subscription: ${stripeSubscription.id} not found in database!`);
    }

    if (comment || feedback) {
      const where = {
        subscription_id: {
          equals: subscription.subscriptionId || '',
        },
      };
      const newFields = { comment, feedback };

      await this.analyticsService.modifyEvent(
        'subscription_cancel',
        subscription.customer.uid,
        where,
        newFields
      );
      return;
    }

    await this.subscriptionService.cancelSubscription(subscription);

    await this.analyticsService.cancelEvent(
      subscription.customer.uid,
      stripeSubscription.id,
      subscription.nextBillingAt,
      reason
    );
  }

  async handleTestEvents(req: RawBodyRequest) {
    const event = (await this.getEvent(req)) as StripeEvent;

    switch (event.type) {
      // case 'customer.subscription.created':
      //   this.handleCustomerSubscriptionCreated(req);
      //   break;
      case 'customer.subscription.updated':
        this.handleCustomerSubscriptionUpdated(req);
        break;
      case 'customer.subscription.deleted':
        this.handleCustomerSubscriptionDeleted(req);
        break;
      case 'checkout.session.completed':
        this.handleCheckoutSessionCompleted(req);
        break;
      case 'invoice.paid':
        this.handleInvoicePaid(req);
        break;
      case 'charge.refunded':
        this.handleChargeRefunded(req);
        break;
      case 'charge.refund.updated':
        this.handleRefundUpdated(req);
        break;
    }
  }

  private async finalizePayment(subscription: Subscription, subscriptionData: any): Promise<void> {
    subscription.nextBillingAt = convertUnixTimestampToDate(subscriptionData.current_period_end);
    await this.subscriptionService.save(subscription);
    await this.paymentLogService.logPayment(subscription, subscriptionData);
  }

  private async getPaymentProvider(): Promise<PaymentProvider> {
    if (!this.paymentProvider) {
      this.paymentProvider = await this.paymentProviderService.getByName(this.name);
    }

    return this.paymentProvider;
  }

  private getWebhookSecret(eventType: string): string {
    return this.configService.get('NODE_ENV') === 'production'
      ? STRIPE_WEBHOOK_SECRETS[eventType]
      : STRIPE_WEBHOOK_SECRETS.test;
  }

  private async getCheckoutSessionPromoInfo(
    checkoutSession: Stripe.Checkout.Session
  ): Promise<{ promoCode: string | null }> {
    try {
      if (!checkoutSession.invoice) {
        throw new Error(`checkoutSession ${checkoutSession.id} doesn't have invoice`);
      }

      const invoice = await this.stripe.invoices.retrieve(checkoutSession.invoice as string);

      if (invoice.discount && invoice.discount.promotion_code) {
        const promoCode = await this.stripe.promotionCodes.retrieve(invoice.discount.promotion_code as string);
        return { promoCode: promoCode.code };
      }

      return { promoCode: null };
    } catch (error) {
      this.logger.log(`Cannot get promocode: ${error.message}`);
      return { promoCode: null };
    }
  }

  private async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Get Stripe processing fees in USD
   */
  private async getFee(invoice: Stripe.Invoice | string): Promise<string | undefined> {
    try {
      if (typeof invoice === 'string') {
        invoice = await this.stripe.invoices.retrieve(invoice);
      }

      const paymentIntent: any = await this.stripe.paymentIntents.retrieve(invoice.payment_intent as string, {
        expand: ['latest_charge.balance_transaction'],
      });

      if (paymentIntent?.latest_charge?.balance_transaction) {
        return centsToUSD(paymentIntent.latest_charge.balance_transaction.fee);
      }

      return undefined;
    } catch (error) {
      this.logger.warn(`Error when get fee: ${error.message} | invoice: ${invoice}`);
      return undefined;
    }
  }
}
