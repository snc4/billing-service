import { ApiProperty } from '@nestjs/swagger';
import { CurrentPlan } from 'src/customer/customer.types';
import { Customer } from 'src/db/entities/customer.entity';

export class GetUserInfoResponseDto {
  @ApiProperty({
    description: 'Информация об Аккаунте',
  })
  customer: Customer;

  @ApiProperty({
    description: 'Информация о текущей подписке',
  })
  currentPlan: CurrentPlan;
}
