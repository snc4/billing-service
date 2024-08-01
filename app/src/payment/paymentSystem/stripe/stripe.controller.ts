import { Controller, Post, HttpCode, Request, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { StripeService } from './stripe.service';
import { RawBodyRequest } from 'express';

@ApiTags('payment/webhook/stripe')
@Controller('payment/webhook/stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  private readonly logger = new Logger(StripeController.name);

  @ApiOperation({
    summary: 'Эндпоинт для обработки хука из stripe',
    description:
      'Cобытие "checkout.session.completed" Происходит при изменении подписки (например, при переходе с одного тарифного плана на другой или при изменении статуса с пробного на активный).',
  })
  @Post('/checkoutSessionCompleted')
  @HttpCode(200)
  async handleCheckoutSessionCompleted(@Request() req: RawBodyRequest): Promise<void> {
    await this.stripeService.handleCheckoutSessionCompleted(req);
  }

  @ApiOperation({
    summary: 'Эндпоинт для обработки хука из stripe',
    description:
      'Cобытие "customer.subscription.created" Происходит всякий раз, когда клиент подписывается на новый тарифный план.',
  })
  @Post('/customerSubscriptionCreated')
  @HttpCode(200)
  async handleCustomerSubscriptionCreated(@Request() req: RawBodyRequest): Promise<void> {
    // Обычная подписка создается или апдейтится через handleSubscriptionUpdated
    // Текущую функцию используем для обработки trial-ов
    await this.stripeService.handleCustomerSubscriptionCreated(req);
  }

  @ApiOperation({
    summary: 'Эндпоинт для обработки хука из stripe',
    description:
      'Cобытие "customer.subscription.updated" Происходит при изменении подписки (например, при переходе с одного тарифного плана на другой или при изменении статуса с пробного на активный).',
  })
  @Post('/customerSubscriptionUpdated')
  @HttpCode(200)
  async handleCustomerSubscriptionUpdated(@Request() req: RawBodyRequest): Promise<void> {
    await this.stripeService.handleCustomerSubscriptionUpdated(req);
  }

  @ApiOperation({
    summary: 'Эндпоинт для обработки хука из stripe',
    description:
      'Cобытие "customer.subscription.deleted" Происходит всякий раз, когда заканчивается подписка клиента или когда она была немедленно отменена',
  })
  @Post('/customerSubscriptionDeleted')
  @HttpCode(200)
  async handleCustomerSubscriptionDeleted(@Request() req: RawBodyRequest): Promise<void> {
    await this.stripeService.handleCustomerSubscriptionDeleted(req);
  }

  @ApiOperation({
    summary: 'Обработка возврата денег пользователю',
    description: 'Событие "charge.refunded" придет после успешного возврата через ЛК страйпа',
  })
  @Post('/chargeRefunded')
  @HttpCode(200)
  async handleChargeRefunded(@Request() req: RawBodyRequest): Promise<void> {
    try {
      await this.stripeService.handleChargeRefunded(req);
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  @ApiOperation({
    summary: 'Обновление данных возврата',
    description: 'Событие charge.refund.updated содержит данные о причине возврата и т.д.',
  })
  @Post('/chargeRefundUpdated')
  @HttpCode(200)
  async handleChargeRefundUpdated(@Request() req: RawBodyRequest): Promise<void> {
    try {
      await this.stripeService.handleRefundUpdated(req);
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  @ApiOperation({
    summary: 'Инвойс успешно оплачен, используем для отслеживания автооплаты',
    description: 'invoice.paid',
  })
  @Post('/invoicePaid')
  @HttpCode(200)
  async invoicePaid(@Request() req: RawBodyRequest): Promise<void> {
    try {
      await this.stripeService.handleInvoicePaid(req);
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  @ApiOperation({
    summary: 'Эндпоинт для обработки хука из stripe',
    description: 'Это хук для тестирования, на него летят сразу все события',
  })
  @Post('/commonTestRoute')
  @HttpCode(200)
  async commonTestRoute(@Request() req: RawBodyRequest): Promise<void> {
    await this.stripeService.handleTestEvents(req);
  }
}
