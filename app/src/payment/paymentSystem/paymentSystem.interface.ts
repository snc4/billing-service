import { Customer } from 'src/db/entities/customer.entity';
import { Product } from 'src/db/entities/product.entity';

import { PaymentPageRedirectResponse, PaymentPageRenderResponse, SubscriptionData, Metadata } from './payment.types';

export interface PaymentSystem<T> {
  name: string;

  getPaymentPage(
    customer: Customer,
    product: Product,
    metadata: Metadata,
  ): Promise<PaymentPageRedirectResponse | PaymentPageRenderResponse>;

  /**
   * Возращает данные в удобном виде для создания сущности Subscription
   * @param webhookData Тело запроса от платежного провайдера
   */
  prepareSubscriptionData(webhookData: T): Promise<SubscriptionData> | SubscriptionData;

  parseDataToRefund(webhookData: T): Promise<{ subscriptionId: string }> | void;

  sendToAnalytics(...args: any[]): Promise<void>;

  handleSubscriptionCancellation(webhookData: T): Promise<void>;
}
