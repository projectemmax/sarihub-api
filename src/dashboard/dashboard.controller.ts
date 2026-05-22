/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Controller,
  Get,
  Query,
  Req,
} from '@nestjs/common';

import { DashboardService }
from './dashboard.service';

import { CurrentUser }
from 'src/auth/decorators/current-user.decorator';

@Controller('admin/dashboard')
export class DashboardController {

    constructor(
        private dashboardService:
        DashboardService
    ) {}

    @Get('stats')
    getStats(
        @Req() req
    ) {

    console.log(
        'REQ USER =>',
        req.user
    );

    return this.dashboardService
        .getStats(
        req.user?.role === 'SELLER'
            ? req.user.storeId
            : undefined
        );
    }

    @Get('analytics')
    getAnalytics(
        @Query('range')
        range: string = '7D'
    ) {

        return this.dashboardService
        .getAnalytics(
            range
        );
    }

    @Get('top-products')
    getTopProducts() {

        return this.dashboardService
        .getTopProducts();
    }

    @Get('latest-customers')
    getLatestCustomers() {

        return this.dashboardService
        .getLatestCustomers();
    }

    @Get('pending-reviews')
    getPendingReviews() {

        return this.dashboardService
        .getPendingReviews();
    }
}