/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('admin/dashboard')
export class DashboardController {
    constructor(private dashboardService: DashboardService) {}

    @Get('stats')
    getStats() {
        return this.dashboardService.getStats();
    }

    @Get('analytics')
    getAnalytics(@Query('range') range: string = '7D') {
        return this.dashboardService.getAnalytics(range);
    }

    @Get('top-products')
    getTopProducts() {
        return this.dashboardService.getTopProducts();
    }

    @Get('latest-customers')
    getLatestCustomers() {
        return this.dashboardService.getLatestCustomers();
    }

    @Get('pending-reviews')
    getPendingReviews() {
        return this.dashboardService.getPendingReviews();
    }

    @Get('/seller')
    getSellerDashboard(
        @CurrentUser()
        user
        ) {

        return this.dashboardService
        .getSellerDashboard(
            user.storeId
        );
    }


}