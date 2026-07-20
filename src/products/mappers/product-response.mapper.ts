import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';

import { MediaResponseDto } from 'src/common/dto/media-response.dto';
import {
  ProductResponseDto,
} from '../dto/response/product-response.dto';
import {
  ProductImageResponseDto,
} from '../dto/response/product-image-response.dto';
import {
  ProductVariantResponseDto,
} from '../dto/response/product-variant-response.dto';
import {
  BrandSummaryResponseDto,
} from '../dto/response/brand-summary-response.dto';
import {
  CategorySummaryResponseDto,
  CategoryParentSummaryResponseDto,
} from '../dto/response/category-summary-response.dto';

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: {
      include: {
        parent: true;
      };
    };
    brand: true;
    images: true;
    variants: true;
  };
}>;

@Injectable()
export class ProductResponseMapper {
    constructor(
        private readonly cloudinaryService: CloudinaryService,
    ) {}

    // ============================================================
    // MEDIA
    // ============================================================

    private toMediaDto(publicId: string): MediaResponseDto {
        return {
        publicId,
        url: this.cloudinaryService.getImageUrl(publicId),
        };
    }

    // ============================================================
    // PRODUCT IMAGE
    // ============================================================

    private toProductImageDto(
        image: ProductWithRelations['images'][number],
    ): ProductImageResponseDto {
        return {
        id: image.id,
        productId: image.productId,
        media: this.toMediaDto(image.url),
        isPrimary: image.isPrimary,
        order: image.order,
        createdAt: image.createdAt,
        };
    }

    // ============================================================
    // VARIANT
    // ============================================================

    private toVariantDto(
        variant: ProductWithRelations['variants'][number],
    ): ProductVariantResponseDto {
        return {
        id: variant.id,
        productId: variant.productId,
        sku: variant.sku,
        price: Number(variant.price),
        stock: variant.stock,
        attributes: variant.attributes as string[],
        image: variant.image
    ? this.toMediaDto(variant.image)
    : null,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
        };
    }

    // ============================================================
    // CATEGORY
    // ============================================================

    private toCategoryDto(
        category: ProductWithRelations['category'],
    ): CategorySummaryResponseDto {
        let parent: CategoryParentSummaryResponseDto | null = null;

        if (category.parent) {
        parent = {
            id: category.parent.id,
            name: category.parent.name,
            slug: category.parent.slug,
        };
        }

        return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        parent,
        };
    }

    // ============================================================
    // BRAND
    // ============================================================

    private toBrandDto(
        brand: ProductWithRelations['brand'],
    ): BrandSummaryResponseDto | null {
        if (!brand) {
        return null;
        }

        return {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        };
    }

    // ============================================================
    // PRODUCT
    // ============================================================

    toProductResponseDto(
        product: ProductWithRelations,
    ): ProductResponseDto {
        return {
        id: product.id,
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription,
        seoDescription: product.seoDescription,
        slug: product.slug,
        sku: product.sku,
        price: Number(product.price),
        stock: product.stock,
        isActive: product.isActive,
        status: product.status,
        isFeatured: product.isFeatured,
        isBestSeller: product.isBestSeller,
        rating: product.rating,
        reviewCount: product.reviewCount,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        categoryId: product.categoryId,
        brandId: product.brandId,
        storeId: product.storeId,
        category: this.toCategoryDto(product.category),
        brand: this.toBrandDto(product.brand),
        images: product.images.map((image) =>
            this.toProductImageDto(image),
        ),
        variants: product.variants.map((variant) =>
            this.toVariantDto(variant),
        ),
        variantOptions: product.variantOptions,
        };
    }

    toProductResponseDtoList(
        products: ProductWithRelations[],
    ): ProductResponseDto[] {
        return products.map((product) =>
        this.toProductResponseDto(product),
        );
    }
}