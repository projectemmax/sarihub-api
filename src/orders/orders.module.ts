import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisModule } from 'src/redis/redis.module';
import { AdminOrdersController } from './admin-orders.controller';
import { SellerOrdersController } from './seller-orders.controller';

@Module({
  imports: [RedisModule],
  controllers: [OrdersController, AdminOrdersController, SellerOrdersController],
  providers: [OrdersService, PrismaService],
})
export class OrdersModule {}