import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AnalyticsEvents } from './analytics.types';
import { DEFAULT_CURRENCY } from 'src/common/analytics.config';
import { analyticsSecret } from 'src/local.config';

type StringFilters = 'string_contains' | 'string_starts_with' | 'string_end_with';

type RawQuery = {
  [key: string]:
    | RawQuery
    | {
        equals: string | number | boolean;
      }
    | Partial<{
        [key in StringFilters]: string;
      }>;
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  private timeout = 5000;

  constructor(private readonly configService: ConfigService) {}

  async refundEvent(
    uid: string,
    subscriptionId: string,
    invoiceId: string,
    value: number,
    currency: string = DEFAULT_CURRENCY,
    reason?: string
  ): Promise<void> {
    await this.send('refund', uid, {
      subscription_id: subscriptionId,
      invoice_id: invoiceId,
      value,
      currency,
      ...(reason && { reason }),
    });
  }

  async cancelEvent(uid: string, subscriptionId: string, expirationDate?: Date, reason?: string): Promise<void> {
    await this.send('subscription_cancel', uid, {
      subscription_id: subscriptionId,
      expiration_date: expirationDate,
      ...(reason && { reason }),
    });
  }

  async resumeEvent(uid: string, subscriptionId: string, expirationDate?: Date): Promise<void> {
    await this.send('subscription_resume', uid, {
      subscription_id: subscriptionId,
      expiration_date: expirationDate,
    });
  }

  async deleteEvent(uid: string, subscriptionId: string): Promise<void> {
    await this.send('subscription_deleted', uid, {
      subscription_id: subscriptionId,
    });
  }

  async purchaseEvent(eventData: {
    subscriptionId: string;
    isAuto: boolean;
    uid: string;
    value: string;
    currency?: string;
    productCode: string;
    productTitle: string;
    promoCode?: string | null;
    invoiceId?: string;
    expirationDate?: Date;
    fee?: string;
  }): Promise<void> {
    await this.send('purchase', eventData.uid, {
      subscription_id: eventData.subscriptionId,
      is_auto: eventData.isAuto,
      value: Number(eventData.value),
      currency: eventData.currency || DEFAULT_CURRENCY,
      product_id: eventData.productCode.toString(),
      product_title: eventData.productTitle,
      ...(eventData.promoCode && { promo_code: eventData.promoCode }),
      ...(eventData.invoiceId && { invoice_id: eventData.invoiceId }),
      ...(eventData.expirationDate && { expiration_date: eventData.expirationDate }),
      ...(eventData.fee && { fee: Number(eventData.fee) }),
    });
  }

  async modifyEvent(
    eventTitle: AnalyticsEvents,
    uid: string,
    where: RawQuery,
    updateOrCreate: { [key: string]: any }
  ): Promise<void> {
    try {
      const response = await fetch(`${this.configService.get('ANALYTICS_HOST')}/event`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          Authorization: `Bearer ${analyticsSecret}`,
        },
        body: JSON.stringify({
          uid,
          event: eventTitle,
          where,
          update: updateOrCreate,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        this.logger.warn(await response.json());
        throw new Error(`Failed to modify ${eventTitle} event for uid: ${uid}`);
      }

      this.logger.log(`${eventTitle} event for uid: ${uid} was modified successfully`);
    } catch (error) {
      this.logger.warn(error.message);
    }
  }

  private async send(eventTitle: AnalyticsEvents, uid: string, data: any): Promise<void> {
    try {
      const response = await fetch(`${this.configService.get('ANALYTICS_HOST')}/notify`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
        },
        body: JSON.stringify({
          uid,
          title: eventTitle,
          happenedAt: new Date(),
          data,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        this.logger.warn(await response.json());
        throw new Error(`Failed to send ${eventTitle} event for uid: ${uid}`);
      }

      this.logger.log(`${eventTitle} event for uid: ${uid} was send successfully`);
    } catch (error) {
      this.logger.warn(error.message);
    }
  }
}
