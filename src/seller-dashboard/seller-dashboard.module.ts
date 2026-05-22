import { Module } from '@nestjs/common';
import { SellerDashboardService } from './seller-dashboard.service';
import { SellerDashboardController } from './seller-dashboard.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DashboardModule } from 'src/dashboard/dashboard.module';
import { DashboardAggregationService } from 'src/dashboard/services/dashboard-aggregation.service';

@Module({
  imports: [PrismaModule, DashboardModule],
  providers: [SellerDashboardService, DashboardAggregationService],
  controllers: [SellerDashboardController]
})
export class SellerDashboardModule {}
