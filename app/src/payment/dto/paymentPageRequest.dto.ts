import { ApiProperty } from '@nestjs/swagger';

export default class PaymentPageRequestDto {
  @ApiProperty({
    required: true,
    type: String,
    description: 'productCode в нашей бд',
  })
  readonly productCode: string;

  @ApiProperty({
    required: true,
    type: String,
    description: 'customer uid',
  })
  readonly uid: string;

  @ApiProperty({
    required: false,
    type: String,
    description: 'trial period days',
  })
  readonly trialDays: string;

  @ApiProperty({
    required: false,
    type: String,
    description: 'our tracking id',
  })
  readonly trackingId: string;
}
