import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { BillingLoggerService } from './logger/billing.logger';

async function bootstrap() {
  // https://stripe.com/docs/webhooks
  // Stripe requires the raw body of the request to perform signature verification.
  // If you’re using a framework, make sure it doesn’t manipulate the raw body.
  // Any manipulation to the raw body of the request causes the verification to fail.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  app.useLogger(app.get(BillingLoggerService));

  app.enableCors();

  app.setBaseViewsDir(`${__dirname}/../views`);
  app.setViewEngine('hbs');

  const swaggerConfig = new DocumentBuilder().setTitle('Billing Service').build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('/api', app, document);

  await app.listen(3000);
}
bootstrap();
