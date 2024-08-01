import { EventEntity } from '@paddle/paddle-node-sdk';
import { Event } from 'stripe';

import { Customer } from 'src/db/entities/customer.entity';
import { PaymentProvider } from 'src/db/entities/paymentProvider.entity';
import { Product } from 'src/db/entities/product.entity';

export type StripeEvent = Event & {
  data: {
    [key: string]: any;
  };
};

export type PaddleEvent = EventEntity & {
  data: {
    [key: string]: any;
  };
};

export type PaymentPageRedirectResponse = {
  url: string;
  statusCode: number;
};

export type PaymentPageRenderResponse = {
  metadata: {
    uid: string;
    productCode: string;
  };
  config?: any;
};

export type SubscriptionData = {
  customer: Customer;
  product: Product;
  paymentProvider: PaymentProvider;
  subscriptionId: string;
  nextBillingAt?: Date;
};

/** Данные, прокинутые с фронтенда */
export type Metadata = {
  trackingId: number;
  trialDays: number;
};

export type AnalyticsParams = {
  uid: string;
  subscriptionId: string;
  isAuto: boolean;
  product: Product;
  value: string;
  metadata: any;
  promoCode?: string | null;
  discount?: number | null;
  invoiceId?: string;
  expirationDate?: Date;
  fee?: string;
  originalPrice?: number | null;
};
