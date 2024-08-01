import { ApiProperty } from '@nestjs/swagger';
import { SupportedPaymentSystems } from 'src/payment/paymentSystem/paymentSystem.config';

export class SetDefaultPaymentProviderRequestDto {
  @ApiProperty({
    required: true,
    type: String,
    description: 'new default provider name',
    enum: SupportedPaymentSystems,
  })
  readonly providerName: SupportedPaymentSystems;
}
