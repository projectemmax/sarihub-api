import { Module } from '@nestjs/common';
import { StorefrontReviewsController } from './storefront-reviews.controller';
import { ReviewsService } from './reviews.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminReviewsController } from './admin-reviews.controller';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';

@Module({
  imports: [PrismaModule],
  controllers: [StorefrontReviewsController, AdminReviewsController],
  providers: [ReviewsService, CloudinaryService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
