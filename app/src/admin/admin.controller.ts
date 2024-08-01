import { Controller, Get, Post, Query, Body, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { GetUserInfoRequestDto } from './dto/getUserInfoRequest.dto';
import { GetUserInfoResponseDto } from './dto/getUserInfoResponse.dto';
import { SetDefaultPaymentProviderRequestDto } from './dto/setDefaultPaymentProviderRequest.dto';

import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({
    summary: 'Получение информации о пользователе(для администратора)',
  })
  @ApiResponse({ status: 200, type: GetUserInfoResponseDto })
  @Get('/getUserInfo')
  @HttpCode(HttpStatus.OK)
  async getUserInfo(@Query() query: GetUserInfoRequestDto): Promise<GetUserInfoResponseDto | []> {
    try {
      return await this.adminService.getUserInfo(query);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({
    summary: 'Смена дефолтной платежной системы',
  })
  @Post('/setDefaultPaymentProvider')
  @HttpCode(200)
  async setDefaultPaymentProvider(@Body() body: SetDefaultPaymentProviderRequestDto): Promise<void> {
    try {
      await this.adminService.setDefaultPaymentProvider(body.providerName);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
