import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { getNoUidEmailIdentificator } from 'src/common/utils';

import { Customer } from 'src/db/entities/customer.entity';

import SubscriptionService from 'src/subscription/subscription.service';

import { CurrentPlan } from './customer.types';

import StatusRequestDto from './dto/statusRequest.dto';
import StatusResponseDto from './dto/statusResponse.dto';

@Injectable()
export default class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private readonly subscriptionService: SubscriptionService
  ) {}

  async getExistingByUid(uid: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { uid } });

    if (!customer) {
      throw new Error(`Customer with uid: ${uid} not found!`);
    }

    return customer;
  }

  /**
   * used to get full relations (for admin purposes)
   */
  async getExistingByUidExtended(uid: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { uid },
      relations: ['subscriptions', 'subscriptions.paymentLogs', 'subscriptions.product'],
    });

    if (!customer) {
      throw new Error(`Customer with uid: ${uid} not found!`);
    }

    return customer;
  }

  async getCurrentPlan(customer: Customer): Promise<CurrentPlan> {
    const activeSubscription = await this.subscriptionService.getCustomerActiveSubscription(customer);

    if (!activeSubscription) {
      return {
        isActive: false,
      };
    }

    return {
      isActive: true,
      planInfo: {
        productCode: activeSubscription.product.productCode,
        nextChargeDate: activeSubscription.nextBillingAt || 'waiting',
        managementUrl: 'stub',
        subscriptionId: activeSubscription.subscriptionId,
      },
      options: activeSubscription.product.options,
    };
  }

  async getOrCreate(uid: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { uid } });

    if (customer) {
      return customer;
    }

    return await this.createCustomer(uid);
  }

  async updateCustomer(customer: Customer) {
    await this.customerRepository.update({ id: customer.id }, customer);
  }

  async status(statusRequest: StatusRequestDto): Promise<StatusResponseDto> {
    // Запрос на статус происходит только из ЛК (а значит юзер зарегистрировался)
    // 1. Если оплата была совершена до регистрации:
    // - то юзер уже был создан в нашей биллинг базе, ему был присвоен uid заглушка: no-uid_<email>
    //   находим его и записываем ему верный uid
    // 2. Если оплаты не было то просто ищем или создаем юзера по uid
    const customer =
      (await this.getUpdatedIfNoUid(statusRequest.uid, statusRequest.email)) ||
      (await this.getOrCreate(statusRequest.uid));

    const currentPlan = await this.getCurrentPlan(customer);

    return { currentPlan };
  }

  private async getUpdatedIfNoUid(uid: string, email: string): Promise<Customer | null> {
    const existingCustomerByUid = await this.customerRepository.findOne({
      where: { uid },
    });

    const existingCustomerByEmail = await this.customerRepository.findOne({
      where: { uid: getNoUidEmailIdentificator(email) },
    });

    if (existingCustomerByUid && existingCustomerByEmail) {
      await this.customerRepository.remove(existingCustomerByUid);
    }

    if (existingCustomerByEmail) {
      existingCustomerByEmail.uid = uid;
      await this.customerRepository.save(existingCustomerByEmail);
      return existingCustomerByEmail;
    }

    return null;
  }

  private async createCustomer(uid: string): Promise<Customer> {
    const customer = new Customer();
    customer.uid = uid;
    await this.customerRepository.save(customer);
    return customer;
  }
}
