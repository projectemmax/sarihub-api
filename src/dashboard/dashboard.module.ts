import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { SellerDashboardController } from 'src/seller-dashboard/seller-dashboard.controller';
import { SellerDashboardService } from 'src/seller-dashboard/seller-dashboard.service';

@Module({
  controllers: [DashboardController, SellerDashboardController],
  providers: [DashboardService, PrismaService, SellerDashboardService],
})
export class DashboardModule {}