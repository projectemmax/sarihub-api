import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProductStatus } from '@prisma/client';

import { ProductImageResponseDto } from './product-image-response.dto';
import { ProductVariantResponseDto } from './product-variant-response.dto';
import { CategorySummaryResponseDto } from './category-summary-response.dto';
import { BrandSummaryResponseDto } from './brand-summary-response.dto';

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

    @ApiPropertyOptional({
    nullable: true,
    })
    description: string | null;

    @ApiPropertyOptional({
    nullable: true,
    })
    shortDescription: string | null;

    @ApiPropertyOptional({
    nullable: true,
    })
    seoDescription: string | null;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  sku?: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({
    enum: ProductStatus,
  })
  status: ProductStatus;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  isBestSeller: boolean;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  reviewCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  categoryId: string;

  @ApiPropertyOptional()
  brandId?: string | null;

  @ApiProperty({
  nullable: true,
})
storeId: string | null;

  @ApiProperty({
    type: CategorySummaryResponseDto,
  })
  category: CategorySummaryResponseDto;

  @ApiPropertyOptional({
    type: BrandSummaryResponseDto,
    nullable: true,
  })
  brand?: BrandSummaryResponseDto | null;

  @ApiProperty({
    type: [ProductImageResponseDto],
  })
  images: ProductImageResponseDto[];

  @ApiProperty({
    type: [ProductVariantResponseDto],
  })
  variants: ProductVariantResponseDto[];

  @ApiPropertyOptional()
  variantOptions?: any;
}