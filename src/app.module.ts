/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CartModule } from './cart/cart.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { UsersModule } from './users/users.module';
import { AdminCustomersModule } from './customers/customers.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CustomerProfileModule } from './customer-profile/customer-profile.module';
import { AdminCartModule } from './admin/carts/admin-cart.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CustomerAddressModule } from './customer-address/customer-address.module';
import { RedisModule } from './redis/redis.module';
import { LocationController } from './location/location.controller';
import { LocationService } from './location/location.service';
import { AccountDashboardModule } from './account/dashboard/account-dashboard.module';
import { SiteConfigModule } from './site-config/site-config.module';
import { PaymentModule } from './payment/payment.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MediaModule } from './media/media.module';
import { SellerDashboardModule } from './seller-dashboard/seller-dashboard.module';
import { AiModule } from './modules/ai/ai.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'local'}`,
        '.env'
      ]
    }),
    PrismaModule, 
    CartModule, 
    AuthModule, 
    OrdersModule, 
    ProductsModule, 
    CategoriesModule, 
    UsersModule, 
    AdminCustomersModule, 
    ReviewsModule, 
    CustomerProfileModule,
    AdminCartModule,
    DashboardModule,
    CustomerAddressModule,
    RedisModule,
    AccountDashboardModule,
    SiteConfigModule,
    PaymentModule,
    ScheduleModule.forRoot(),
    MediaModule,
    SellerDashboardModule,
    AiModule,
  ],
  controllers: [AppController, LocationController],
  providers: [AppService, LocationService],
})
export class AppModule {}
