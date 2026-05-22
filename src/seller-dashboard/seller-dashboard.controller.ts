/* eslint-disable prettier/prettier */
import { Controller, Get, Req, Query } from '@nestjs/common';
import { SellerDashboardService } from './seller-dashboard.service';

@Controller('seller/dashboard')
export class SellerDashboardController {
    constructor(
        private readonly dashboardService: SellerDashboardService,
    ) {}

    @Get('stats')
    getStats(@Req() req: any) {
        return this.dashboardService.getStats(req.user.storeId);
    }

    @Get('analytics')
    getAnalytics(
        @Req() req: any,
        @Query('range') range = '7D',
    ) {
        return this.dashboardService.getAnalytics(
        req.user.storeId,
        range,
        );
    }

    @Get('top-products')
    getTopProducts(@Req() req: any) {
        return this.dashboardService.getTopProducts(
        req.user.storeId,
        );
    }
}