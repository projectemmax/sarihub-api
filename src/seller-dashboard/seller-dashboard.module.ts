import { Module } from '@nestjs/common';
import { SellerDashboardService } from './seller-dashboard.service';
import { SellerDashboardController } from './seller-dashboard.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SellerDashboardService],
  controllers: [SellerDashboardController]
})
export class SellerDashboardModule {}
