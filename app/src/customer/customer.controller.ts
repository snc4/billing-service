import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';

import CustomerService from 'src/customer/customer.service';

import StatusRequestDto from './dto/statusRequest.dto';
import StatusResponseDto from './dto/statusResponse.dto';

@ApiTags('customer')
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @ApiOperation({
    summary: 'get user subscription info',
  })
  @Get('/status')
  @ApiOkResponse({ type: StatusResponseDto })
  @HttpCode(HttpStatus.OK)
  async status(@Query() statusRequest: StatusRequestDto): Promise<StatusResponseDto> {
    return await this.customerService.status(statusRequest);
  }
}
