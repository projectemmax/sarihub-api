/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrdersService } from './orders.service';
import { AdminOrdersQueryDto } from './dto/admin-orders-query.dto';
import { AdminUpdateOrderStatusDto } from './dto/admin-update-order-status.dto';
import { AdminShipOrderDto } from './dto/admin-ship-order.dto';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminOrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Get()
    async getAdminOrders(

        @Query()
        query: AdminOrdersQueryDto,

        @Req()
        req,

    ) {

        return this.ordersService
            .getAdminOrders(
                query,
                req.user
            );

    }

    @Get(':id')
    async getAdminOrderById(@Param('id') id: string) {
        return this.ordersService.getAdminOrderById(id);
    }

    @Patch(':id/status')
    async updateAdminOrderStatus(
        @Param('id') id: string,
        @Body() dto: AdminUpdateOrderStatusDto,
        @Req() req,
    ) {
        return this.ordersService.updateAdminOrderStatus(
            id,
            dto,
            req.user.id,
        );
    }

    @Patch(':id/ship')
    async shipAdminOrder(
        @Param('id') id: string,
        @Body() dto: AdminShipOrderDto,
        @Req() req,
    ) {
        return this.ordersService.shipAdminOrder(id, dto, req.user.id);
    }
}
