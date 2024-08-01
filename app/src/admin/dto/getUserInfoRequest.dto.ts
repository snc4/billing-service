import { ApiProperty } from '@nestjs/swagger';

export class GetUserInfoRequestDto {
  @ApiProperty({
    required: false,
    type: String,
    description: 'uid',
  })
  readonly uid: string;
}
