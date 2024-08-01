import { Controller, Post, HttpCode, Request, Logger, RawBodyRequest } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventName } from '@paddle/paddle-node-sdk';

import { PaddleService } from './paddle.service';

@ApiTags('payment/webhook/paddle')
@Controller('payment/webhook/paddle')
export class PaddleController {
  constructor(private readonly paddleService: PaddleService) {}

  private readonly logger = new Logger(PaddleController.name);

  @ApiOperation({
    summary: 'Эндпоинт для обработки вебхуков paddle',
  })
  @Post('/')
  @HttpCode(200)
  async webhooks(@Request() req: RawBodyRequest<Request>): Promise<void> {
    try {
      const event = this.paddleService.getEvent(req);

      if (!event) {
        throw new Error('Not valid event');
      }

      switch (event.eventType) {
        case EventName.TransactionCompleted:
          await this.paddleService.handleTransactionCompleted(event);
          break;
        case EventName.SubscriptionUpdated:
          if (event.data.scheduledChange?.action === 'cancel') {
            await this.paddleService.handleSubscriptionCancellation(event);
          }
          break;
        case EventName.AdjustmentUpdated:
          await this.paddleService.handleRefund(event);
          break;
        default:
          throw new Error(`Unsupported event: ${event.eventType}`);
      }
    } catch (error) {
      this.logger.error(error.message);
      throw new Error(error);
    }
  }
}
