import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { CreateReviewDto } from './dto/create-review.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from 'src/auth/interfaces/auth-user.interface';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('reviews')
export class StorefrontReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ================= USER =================

  @UseGuards(JwtAuthGuard)
  @Post(':slug')
  @ApiOperation({ summary: 'Create product review (verified purchase only)' })
  async createReview(
    @Param('slug') slug: string,
    @Body() dto: CreateReviewDto,
    @Req() req,
  ) {
    return this.reviewsService.createReview(
      slug,
      req.user.id,
      dto.rating,
      dto.comment,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':slug/me')
  @ApiOperation({ summary: 'Get my review for a product' })
  async getMyReview(@Param('slug') slug: string, @Req() req) {
    const review = await this.reviewsService.getMyReview(
      slug,
      req.user.id,
    );

    return { data: review };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/vote')
  @ApiOperation({ summary: 'Vote review as helpful' })
    voteReview(
      @Param('id') reviewId: string,
      @Req() req
    ) {
    return this.reviewsService.voteReview(
      reviewId,
      req.user.id
    );
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5))
  uploadReviewImages(
    @Param('id') reviewId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: AuthUser,
  ) {
    return this.reviewsService.uploadImages(reviewId, files, user.id);
  }

}
