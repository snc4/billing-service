import { Injectable } from '@nestjs/common';
import { AbstractLogger } from './abstract.logger';

@Injectable()
export class BillingLoggerService extends AbstractLogger {
  public context = 'billing-service';
}
