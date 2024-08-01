import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { dataSourceOptions } from './db/typeorm.config';

import { CustomerModule } from './customer/customer.module';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';
import { getPinoConfig } from './logger/pino-logger.config';
import { LoggerModule } from 'nestjs-pino';
import { BillingLoggerService } from './logger/billing.logger';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production').required(),
        DB_HOST: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
      }),
    }),
    LoggerModule.forRootAsync(getPinoConfig()),
    TypeOrmModule.forRoot(dataSourceOptions),
    CustomerModule,
    PaymentModule,
    AdminModule,
  ],
  providers: [BillingLoggerService],
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}
