import { ApiProperty } from '@nestjs/swagger';

export default class StatusRequestDto {
  @ApiProperty({
    required: true,
    type: String,
    description: 'customer uid',
  })
  readonly uid: string;

  @ApiProperty({
    required: true,
    type: String,
    description: 'customer email',
  })
  readonly email: string;
}
