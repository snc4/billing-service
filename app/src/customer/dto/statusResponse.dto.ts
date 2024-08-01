import { ApiProperty } from '@nestjs/swagger';
import { CurrentPlan } from '../customer.types';

const currentPlanExample: CurrentPlan = {
  isActive: true,
  planInfo: {
    productCode: '123',
    nextChargeDate: '2023-07-09T10:01:26.032Z',
    managementUrl: 'https://shop.com/order/status/5555555/1a97507#autorenewal',
    subscriptionId: 'sub_1Pf9LzI9Vtt1hch667bXasZu',
  },
  options: {
    resumeCount: 1,
  },
};

export default class StatusResponseDto {
  @ApiProperty({
    required: true,
    type: Object,
    example: currentPlanExample,
    description: 'User current plan',
  })
  readonly currentPlan: CurrentPlan;
}
