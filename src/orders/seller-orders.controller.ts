/* eslint-disable prettier/prettier */
import {
    Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { OrdersService } from './orders.service';
import { AdminUpdateOrderStatusDto } from './dto/admin-update-order-status.dto';
import { AdminShipOrderDto } from './dto/admin-ship-order.dto';

@Controller('seller/orders')
@UseGuards(JwtAuthGuard)
export class SellerOrdersController {

    constructor(
        private readonly ordersService: OrdersService,
    ) {}

    @Get()
    getSellerOrders(

        @CurrentUser()
        user: AuthUser,

        @Query('page')
        page = '1',

        @Query('limit')
        limit = '10',

        @Query('status')
        status?: string,

        @Query('search')
        search?: string,

    ) {

        return this.ordersService
            .getSellerOrders(
                user.id,
                Number(page),
                Number(limit),
                status,
                search,
            );

    }

    @Get(':id')
    getSellerOrderById(
        @Param('id')
        id: string,
        @CurrentUser()
        user: AuthUser,

    ) {

        return this.ordersService
            .getSellerOrderById(
                id,
                user.id
            );

    }

    @Patch(':id/status')
    updateSellerOrderStatus(

        @Param('id')
        id: string,

        @Body()
        dto: AdminUpdateOrderStatusDto,

        @CurrentUser()
        user: AuthUser,

    ) {

        return this.ordersService
            .updateSellerOrderStatus(
                id,
                dto,
                user.id
            );

    }

    @Patch(':id/ship')
    shipSellerOrder(

        @Param('id')
        id: string,

        @Body()
        dto: AdminShipOrderDto,

        @CurrentUser()
        user: AuthUser,

    ) {

        return this.ordersService
            .shipSellerOrder(
                id,
                dto,
                user.id,
            );

    }

}