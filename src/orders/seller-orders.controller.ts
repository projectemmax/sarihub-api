/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { OrdersService } from './orders.service';

@Controller('seller/orders')
@UseGuards(JwtAuthGuard)
export class SellerOrdersController {

    constructor(
        private readonly ordersService: OrdersService,
    ) {}

    @Get()
    getSellerOrders(
        @CurrentUser() user: AuthUser,

        @Query('page') page = '1',

        @Query('limit') limit = '10',
    ) {
        return this.ordersService.getSellerOrders(
        user.id,
        Number(page),
        Number(limit),
        );
    }
}