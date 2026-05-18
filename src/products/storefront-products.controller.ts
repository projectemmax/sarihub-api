/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ReviewsService } from 'src/reviews/reviews.service';

@Controller('products')
export class StorefrontProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly reviewService: ReviewsService
) {}

    // GET /api/products (storefront)
    @Get()
    getStorefrontProducts(@Query() query: any) {
        return this.productsService.getStorefrontProducts(query);
    }

    // GET /api/products/:slug
    @Get(':slug')
    getProductBySlug(@Param('slug') slug: string) {
        return this.productsService.getProductBySlug(slug);
    }

    // GET /api/products/:slug/reviews
    @Get(':slug/reviews')
    getProductReviews(
        @Param('slug') slug: string,
        @Query('page') page = 1,
        @Query('limit') limit = 5,
    ) {
        return this.reviewService.getProductReviews(
            slug,
            Number(page),
            Number(limit),
        );
    }

    @Get(':slug/has-purchased')
    @UseGuards(JwtAuthGuard)
        async hasPurchased(
        @Req() req: any,
        @Param('slug') slug: string
        ) {
            return this.productsService.hasPurchasedProduct(
                req.user.id,
                slug
        );
    }


}
