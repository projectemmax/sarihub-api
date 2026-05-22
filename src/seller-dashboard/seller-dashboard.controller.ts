/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

import { SellerDashboardService }
from './seller-dashboard.service';

@Controller('seller/dashboard')

@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)

@Roles(
  UserRole.SELLER
)

export class SellerDashboardController {

  constructor(
    private dashboard:
    SellerDashboardService
  ) {}

  @Get('stats')
  stats(
    @Req() req
  ) {

    console.log(
        'SELLER REQ USER =>',
        req.user
    );

    return this.dashboard
      .stats(
        req.user.storeId
      );
  }

  @Get('analytics')
  analytics(
    @Req() req,

    @Query('range')
    range: string
  ) {

    return this.dashboard
      .analytics(
        req.user.storeId,
        range
      );
  }

  @Get('top-products')
  topProducts(
    @Req() req
  ) {

    return this.dashboard
      .topProducts(
        req.user.storeId
      );
  }

  @Get('latest-customers')
  customers(
    @Req() req
  ) {

    return this.dashboard
      .latestCustomers(
        req.user.storeId
      );
  }

  @Get('pending-reviews')
  reviews(
    @Req() req
  ) {

    return this.dashboard
      .pendingReviews(
        req.user.storeId
      );
  }
}