import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SubscriptionModule } from 'src/subscription/subscription.module';
import { ProductModule } from 'src/product/product.module';

import { Customer } from 'src/db/entities/customer.entity';

import { CustomerController } from './customer.controller';

import CustomerService from './customer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), SubscriptionModule, ProductModule],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [TypeOrmModule, CustomerService],
})
export class CustomerModule {}
