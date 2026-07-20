import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';
import { StorefrontProductsController } from './storefront-products.controller';
import { AdminProductsController } from './admin-products.controller';
import { ReviewsModule } from 'src/reviews/reviews.module';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { ProductResponseMapper } from './mappers/product-response.mapper';

@Module({
  imports: [ReviewsModule],
  controllers: [StorefrontProductsController, AdminProductsController],
  providers: [ProductsService, PrismaService, CloudinaryService, ProductResponseMapper],
})
export class ProductsModule {}