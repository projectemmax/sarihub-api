/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService, private cloudinaryService: CloudinaryService) {}

    private generateSlug(name: string): string {
        return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    async getStorefrontProducts(query: any) {
        const page = Math.max(Number(query.page) || 1, 1);
        const limit = Math.min(Number(query.limit) || 12, 50);
        const skip = (page - 1) * limit;

        const {
        categoryId,
        search,
        sort,
        status,
        isFeatured,
        isBestSeller,
        inStock,
        priceMin,
        priceMax,
        } = query;

        const where: any = {
            isActive: true,
            status: 'PUBLISHED',
            category: {
                isActive: true,
                deletedAt: null,
            },
        };

        if (categoryId) where.categoryId = categoryId;
        if (isFeatured === 'true') where.isFeatured = true;
        if (isBestSeller === 'true') where.isBestSeller = true;
        if (inStock === 'true') {
            where.OR = [
                { stock: { gt: 0 } },
                {
                variants: {
                    some: { stock: { gt: 0 } }
                }
                }
            ];
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                {
                    variants: {
                    some: {
                        sku: { contains: search, mode: 'insensitive' }
                    }
                    }
                }
            ];
        }

        const minPrice = priceMin ? Number(priceMin) : undefined;
        const maxPrice = priceMax ? Number(priceMax) : undefined;

        if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = {
                ...(minPrice !== undefined && { gte: minPrice }),
                ...(maxPrice !== undefined && { lte: maxPrice }),
            };
        }

        let orderBy: any = { createdAt: 'desc' };
        if (sort === 'price_asc') orderBy = { price: 'asc' };
        if (sort === 'price_desc') orderBy = { price: 'desc' };
        if (sort === 'latest') orderBy = { createdAt: 'desc' };

        const [items, total, priceAgg] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take: limit,
                include: {
                    category: { 
                        select: { 
                            id: true, 
                            name: true 
                        } 
                    },
                    variants: {
                        orderBy: {
                            createdAt: 'asc',
                        },
                    },
                    images: {
                        orderBy: {
                            order: 'asc',
                        },
                    },
                },
                orderBy,
            }),
            this.prisma.product.count({ where }),
            this.prisma.product.aggregate({
                where,
                _min: { price: true },
                _max: { price: true },
            }),
        ]);

        return {
            data: items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                priceRange: {
                min: priceAgg._min.price ?? 0,
                max: priceAgg._max.price ?? 0,
                },
            },
        };
    }

    async getProductBySlug(slug: string) {
        const product = await this.prisma.product.findFirst({
            where: { slug, status: 'PUBLISHED', isActive: true },
            include: {
                category: { select: { id: true, name: true } },
                reviews: { select: { rating: true } },
                variants: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
                images: {
                    orderBy: {
                        order: 'asc',
                    },
                },
            },
        });

        if (!product) {
        throw new NotFoundException('Product not found');
        }

        const reviewCount = product.reviews.length;
        const rating =
        reviewCount === 0
            ? 0
            : product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;

        const { reviews, ...cleanProduct } = product;

        return {
        data: {
            ...cleanProduct,
            rating: Number(rating.toFixed(1)),
            reviewCount,
        },
        };
    }

    async getProductReviews(slug: string) {
        const product = await this.prisma.product.findFirst({
            where: { slug, isActive: true },
            select: { id: true },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        const reviews = await this.prisma.review.findMany({
            where: {
                productId: product.id,
                status: 'APPROVED'
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true,
            },
        });

        return { data: reviews };
    }

    // ==========================
    // ADMIN: GET PRODUCTS
    // ==========================
    async getAdminProducts(
        query: any,
        user: any
    ) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;

        const {
            categoryId,
            search,
            isActive,
            featured,
            bestSeller,
            status,
        } = query;

        const where: any = {};

        if (
            user.role === 'SELLER'
        ) {

            if (!user.storeId) {
                throw new ConflictException(
                    'Seller has no store'
                );
            }

            where.storeId = user.storeId;
        }

        const toBoolean = (v: any) =>
            v === undefined ? undefined : v === 'true' || v === true;

        if (categoryId) where.categoryId = categoryId;
        if (featured !== undefined) where.isFeatured = toBoolean(featured);
        if (bestSeller !== undefined) where.isBestSeller = toBoolean(bestSeller);
        if (status === 'PUBLISHED' || status === 'DRAFT' || status === 'ARCHIVED') {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { name: { contains: String(search), mode: 'insensitive' } },
                { sku: { contains: String(search), mode: 'insensitive' } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take: limit,
                include: {
                    category: { select: { id: true, name: true } },
                    variants: true,
                    images: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.product.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data: items,
            meta: {
            page,
            limit,
            total,
            totalPages,
            },
        };
    }

    // ==========================
    // ADMIN: CREATE PRODUCT
    // ==========================
    async createProduct(
        body: any,
        user: any
    ) {
        const {
            sku,
            name,
            description,
            price,
            categoryId,
            stock,
            status,
            variants = [],
            images = [],
            variantOptions = [],
            isFeatured = false,
            isBestSeller = false,
        } = body;

        if (!name || !categoryId) {
            throw new BadRequestException('Name and category are required');
        }

        if (!variants.length && (price === undefined || price === null)) {
            throw new BadRequestException('Price is required for simple product');
        }

        if (!variants.length && (stock === undefined || stock === null)) {
            throw new BadRequestException('Stock is required for simple product');
        }

        if (!variants?.length) {
            if (price === undefined || stock === undefined) {
                throw new BadRequestException(
                    'Price and stock are required for simple product'
                );
            }
        }

        const slug = this.generateSlug(name);

        const baseSku = sku || `${slug}-default`;

        let storeId = body.storeId;

        if (
            user.role === 'SELLER'
        ) {

            if (!user.storeId) {
                throw new ConflictException(
                    'Seller has no store'
                );
            }

            storeId =
                user.storeId;
        }

        return this.prisma.product.create({
            data: {
                storeId,
                name,
                slug,
                description,
                categoryId,
                isFeatured,
                isBestSeller,
                status: status ?? 'DRAFT',
                isActive: true,

                variantOptions: variantOptions?.length ? variantOptions : null,

                // ✅ FALLBACK (simple product)
                sku: baseSku,
                price: variants.length ? 0 : price,
                stock: variants.length ? 0 : stock,

                // ✅ VARIANTS (if exists)
                variants: variants.length
                    ? {
                        create: variants.map((v: any) => ({
                            sku: v.sku,
                            price: Number(v.price),
                            stock: Number(v.stock),
                            attributes: v.attributes,
                            image: v.image || null
                        })),
                    }
                    : undefined,

                // ✅ IMAGES
                images: images.length
                    ? {
                        create: images.map((img: any, index: number) => ({
                        url: img.url,
                        isPrimary: img.isPrimary,
                        order: index,
                        })),
                    }
                    : undefined,
                },
                include: {
                variants: true,
                images: true,
            },
        });
    }

    async getProductById(
        id: string,
        user: any
    ) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                variants: true,
                images: true  
            }
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (
            user.role === 'SELLER'
            &&
            product.storeId !==
                user.storeId
        ) {
            throw new NotFoundException(
                'Product not found'
            );
        }

        return { data: product };
    }

    // ==========================
    // ADMIN: UPDATE PRODUCT
    // ==========================
    async updateProduct(
        id: string, 
        body: any,
        user: any
    ) {
        const existing = await this.prisma.product.findUnique({
            where: { id },
            include: {
                variants: true,
                images: true,
            },
        });

        if (!existing) {
            throw new NotFoundException('Product not found');
        }

        if (
            user.role === 'SELLER'
            &&
            existing.storeId !== user.storeId
        ) {
            throw new BadRequestException(
                'Access denied'
            );
        }

        const {
            name,
            description,
            categoryId,
            price,
            stock,
            variants,
            images,
            variantOptions,
            isActive,
            isFeatured,
            isBestSeller,
            status,
        } = body;

        // 🔥 FAST PATH — status only update (skip heavy transaction)
        if (
            status !== undefined &&
            variants === undefined &&
            images === undefined &&
            variantOptions === undefined
        ) {
            return this.prisma.product.update({
                where: { id },
                data: { status },
            });
        }

        // 🚀 FULL TRANSACTION
        return this.prisma.$transaction(async (tx) => {

            // ==========================
            // 🔹 UPDATE BASE PRODUCT
            // ==========================
            const product = await tx.product.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(description && { description }),
                    ...(categoryId && { categoryId }),
                    ...(isActive !== undefined && { isActive }),
                    ...(isFeatured !== undefined && { isFeatured }),
                    ...(isBestSeller !== undefined && { isBestSeller }),
                    ...(status !== undefined && { status }),

                    ...(variants === undefined && price !== undefined && { price: Number(price) }),
                    ...(variants === undefined && stock !== undefined && { stock: Number(stock) }),

                    ...(variantOptions !== undefined && {
                    variantOptions:
                        variantOptions.length > 0 ? variantOptions : null,
                    }),
                },
            });

            // ==========================
            // 🔹 VARIANTS (SAFE UPDATE)
            // ==========================
            if (variants !== undefined) {

                const existingVariantIds = existing.variants.map(v => v.id);
                const incomingVariantIds = variants
                    .filter((v: any) => v.id)
                    .map((v: any) => v.id);

                const variantsToDelete = existingVariantIds.filter(
                    id => !incomingVariantIds.includes(id)
                );

                const variantsToUpdate = variants.filter((v: any) => v.id);
                const variantsToCreate = variants.filter((v: any) => !v.id);

                // DELETE removed
                if (variantsToDelete.length) {
                    await tx.productVariant.deleteMany({
                    where: { id: { in: variantsToDelete } },
                    });
                }

                // UPDATE existing
                for (const v of variantsToUpdate) {
                    await tx.productVariant.update({
                        where: { id: v.id },
                        data: {
                            sku: v.sku,
                            price: Number(v.price),
                            stock: Number(v.stock),
                            attributes: v.attributes,
                            image: v.image || null,
                        },
                    });
                }

                // CREATE new
                if (variantsToCreate.length) {
                    await tx.productVariant.createMany({
                        data: variantsToCreate.map((v: any) => ({
                            productId: id,
                            sku: v.sku,
                            price: Number(v.price),
                            stock: Number(v.stock),
                            attributes: v.attributes,
                            image: v.image || null,
                        })),
                    });
                }
            }

            // ==========================
            // 🔹 IMAGES (SAFE UPDATE)
            // ==========================
            if (images !== undefined) {

                const existingImageIds = existing.images.map(i => i.id);
                const incomingImageIds = images
                    .filter((i: any) => i.id)
                    .map((i: any) => i.id);

                const imagesToDelete = existingImageIds.filter(
                    id => !incomingImageIds.includes(id)
                );

                const imagesToUpdate = images.filter((i: any) => i.id);
                const imagesToCreate = images.filter((i: any) => !i.id);

                // DELETE removed
                if (imagesToDelete.length) {
                    await tx.productImage.deleteMany({
                    where: { id: { in: imagesToDelete } },
                    });
                }

                // UPDATE existing
                for (const img of imagesToUpdate) {
                    await tx.productImage.update({
                        where: { id: img.id },
                        data: {
                            url: img.url,
                            isPrimary: img.isPrimary,
                            order: img.order,
                        },
                    });
                }

                // CREATE new
                if (imagesToCreate.length) {
                    await tx.productImage.createMany({
                        data: imagesToCreate.map((img: any, index: number) => ({
                            productId: id,
                            url: img.url,
                            isPrimary: img.isPrimary,
                            order: img.order ?? index,
                        })),
                    });
                }
            }

            return product;
        });
    }

    async bulkUpdateStatus(body: { ids: string[]; status: 'DRAFT' | 'PUBLISHED' }) {
        const { ids, status } = body;

        if (!ids.length) {
            throw new BadRequestException('No product IDs provided');
        }

        const result = await this.prisma.product.updateMany({
            where: {
                id: { in: ids },
            },
            data: {
                status,
            },
        });

        return {
            message: 'Products updated successfully',
            count: result.count,
        };
    }

    // ==========================
    // ADMIN: SOFT DELETE
    // ==========================
    async softDeleteProduct(id: string): Promise<void> {
        await this.prisma.product.update({
            where: { id },
            data: {
                status: 'ARCHIVED',
                isActive: false,
            },
        });
    }

    async restoreProduct(id: string): Promise<void> {
        await this.prisma.product.update({
            where: { id },
            data: {
            status: 'DRAFT',
            },
        });
    }

    async hardDeleteProduct(id: string): Promise<void> {
        const product = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (product.status !== 'ARCHIVED') {
            throw new BadRequestException(
            'Only archived products can be permanently deleted.',
            );
        }

        await this.prisma.$transaction([
            this.prisma.productImage.deleteMany({
            where: { productId: id },
            }),

            this.prisma.productVariant.deleteMany({
            where: { productId: id },
            }),

            this.prisma.product.delete({
            where: { id },
            }),
        ]);
    }

    // ==========================
    // ADMIN: UPLOAD IMAGE
    // ==========================
    async uploadProductImage(id: string, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Image is required');
        }

        // Upload to Cloudinary
        const uploaded = await this.cloudinaryService.uploadImage(file, { folder: 'products' });

        return this.prisma.product.update({
            where: { id },
            data: { imageUrl: uploaded.url }, // ✅ SAVE FULL URL
        });
    }

    async hasPurchasedProduct(userId: string, slug: string) {

        const product = await this.prisma.product.findUnique({
            where: { slug }
        });

        if (!product) {
            return { data: false };
        }

        const purchase = await this.prisma.orderItem.findFirst({
            where: {
                productId: product.id,
                order: {
                    userId,
                    status: { in: ['DELIVERED', 'COMPLETED'] },
                }
            }
        });

        return { data: !!purchase };
    }

    async uploadVariantImage(
        productId: string,
        variantId: string,
        file: Express.Multer.File
    ) {
        if (!file) throw new BadRequestException('Image required');

        const uploaded = await this.cloudinaryService.uploadImage(file, {
            folder: `products/${productId}/variants`,
            public_id: variantId, // 🔥 IMPORTANT
            overwrite: true
        });

        return {
            public_id: uploaded.publicId,
            url: uploaded.url
        };
    }


}
