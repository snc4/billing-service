import { Controller, Get, Query, Redirect, Req, Res, Headers } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

// types/dtos
import PaymentPageRequestDto from './dto/paymentPageRequest.dto';
import { PaymentPageRedirectResponse, PaymentPageRenderResponse } from './types/payment.types';
import { PaymentService } from './payment.service';
import { PaymentPageRequestHeaders } from './dto/paymentPageRequest.headers';
import { SupportedPaymentSystems } from './paymentSystem/paymentSystem.config';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({
    summary: 'Генерация ссылки на оплату',
    description: 'Редирект/Рендер на страницу оплаты',
  })
  @Get('redirectToPaymentPage')
  async redirectToPaymentPage(
    @Headers() headers: PaymentPageRequestHeaders,
    @Req() req: Request & { ip: string },
    @Res() res: Response,
    @Query() paymentPageRequestDto: PaymentPageRequestDto
  ): Promise<void> {
    const paymentSystem = await this.paymentService.getDefaultPaymentSystem();

    const paymentParams = {
      paymentPageRequestDto,
      paymentSystem,
    };

    switch (paymentSystem.name) {
      // Для stripe создаем сессию, прокидываем туда параметры, достаем её урл и редиректим туда
      case SupportedPaymentSystems.STRIPE:
        const { statusCode, url } = (await this.paymentService.redirectToPaymentPage(
          paymentParams
        )) as PaymentPageRedirectResponse;
        return res.redirect(statusCode, url);

      // страница оплаты Paddle отрисовывается на нашей стороне
      case SupportedPaymentSystems.PADDLE:
        const { metadata, config } = (await this.paymentService.redirectToPaymentPage(
          paymentParams
        )) as PaymentPageRenderResponse;
        return res.render('checkout', { metadata, config });
    }
  }
}
