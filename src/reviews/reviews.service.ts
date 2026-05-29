/* eslint-disable prettier/prettier */
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewStatus } from '@prisma/client';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // ================= USER =================

    async createReview(
        slug: string,
        userId: string,
        rating: number,
        comment?: string,
    ) {
        if (!rating || rating < 1 || rating > 5) {
            throw new BadRequestException('Invalid rating');
        }

        const product = await this.prisma.product.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // 1️⃣ Verify purchase
        const orderItem = await this.prisma.orderItem.findFirst({
            where: {
                productId: product.id,
                order: {
                    userId,
                    status: { in: ['DELIVERED', 'COMPLETED'] },
                },
                review: null,
            },
            include: { order: true },
        });

        if (!orderItem) {
            throw new ForbiddenException(
                'Only verified buyers can review this product',
            );
        }

        // 2️⃣ Prevent duplicate review
        const existingReview = await this.prisma.review.findFirst({
            where: {
                userId,
                orderItemId: orderItem.id,
                deletedAt: null,
            },
        });

        if (existingReview) {
            throw new BadRequestException(
                'You already reviewed this purchase',
            );
        }

        // 3️⃣ Create review
        const review = await this.prisma.review.create({
            data: {
                rating,
                comment,
                userId,
                productId: product.id,
                orderItemId: orderItem.id,
                isVerified: true,
                status: 'PENDING',
            },
        });

        return review;
    }

    async getMyReview(slug: string, userId: string) {
        const product = await this.prisma.product.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return this.prisma.review.findFirst({
            where: {
                userId,
                productId: product.id,
                deletedAt: null,
            },
        });
    }

    async softDeleteReview(id: string) {
        const review = await this.prisma.review.update({
            where: { id },
            data: { deletedAt: new Date() },
            select: { productId: true },
        });

        await this.recalcProductRating(review.productId);
    }

    // ================= ADMIN =================

    async toggleReviewApproval(id: string, approve: boolean) {
        const review = await this.prisma.review.update({
            where: { id },
            data: {
            status: approve ? ReviewStatus.APPROVED : ReviewStatus.REJECTED
            },
            select: {
            productId: true
            }
        });

        await this.recalcProductRating(review.productId);
    }

    // ================= SHARED =================

    private async recalcProductRating(productId: string) {
        const stats = await this.prisma.review.aggregate({
            where: {
                productId,
                status: 'APPROVED',
                deletedAt: null,
            },
            _avg: { rating: true },
            _count: true,
        });

        await this.prisma.product.update({
            where: { id: productId },
            data: {
                rating: Number((stats._avg.rating ?? 0).toFixed(1)),
                reviewCount: stats._count,
            },
        });
    }

    async getProductReviews(
        slug: string,
        page: number,
        limit: number,
    ) {
        const product = await this.prisma.product.findUnique({
            where: { slug },
            select: {
                id: true,
                rating: true,
                reviewCount: true,
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        const skip = (page - 1) * limit;

        const reviews = await this.prisma.review.findMany({
            where: {
                productId: product.id,
                status: 'APPROVED',
                deletedAt: null,
            },
            include: {
                user: {
                    select: {
                        customer: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                images: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip,
            take: limit,
        });

        const totalReviews = await this.prisma.review.count({
            where: {
                productId: product.id,
                status: 'APPROVED',
                deletedAt: null,
            },
        });

        return {
            rating: product.rating,
            reviewCount: product.reviewCount,
            page,
            totalPages: Math.ceil(totalReviews / limit),
            reviews,
        };
    }

    async voteReview(reviewId: string, userId: string) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
            select: { helpfulCount: true },
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        const existingVote = await this.prisma.reviewVote.findUnique({
            where: {
            userId_reviewId: {
                userId,
                reviewId,
            },
            },
        });

        // REMOVE VOTE (toggle off)
        if (existingVote) {
            await this.prisma.reviewVote.delete({
            where: { id: existingVote.id },
            });

            const updatedReview = await this.prisma.review.update({
            where: { id: reviewId },
            data: {
                helpfulCount: { decrement: 1 },
            },
            select: { helpfulCount: true },
            });

            return {
            voted: false,
            helpfulCount: updatedReview.helpfulCount,
            };
        }

        // ADD VOTE
        await this.prisma.reviewVote.create({
            data: {
            userId,
            reviewId,
            isHelpful: true,
            },
        });

        const updatedReview = await this.prisma.review.update({
            where: { id: reviewId },
            data: {
            helpfulCount: { increment: 1 },
            },
            select: { helpfulCount: true },
        });

        return {
            voted: true,
            helpfulCount: updatedReview.helpfulCount,
        };
    }

    async uploadImages(
        reviewId: string,
        files: Express.Multer.File[],
        userId: string,
    ) {
        if (!files?.length) {
            throw new BadRequestException('No images uploaded');
        }

        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        if (review.userId !== userId) {
            throw new ForbiddenException('Not your review');
        }

        const uploadedImages = await Promise.all(
            files.map(file =>
                this.cloudinaryService.uploadImage(file, {
                    folder: 'reviews',
                }),
            ),
        );

        const images = uploadedImages.map(image => ({
            url: image.url,
            reviewId,
        }));

        await this.prisma.reviewImage.createMany({
            data: images,
        });

        return { uploaded: images.length, images };
    }

    // ADMIN Service
    async getPendingReviews() {
        return this.prisma.review.findMany({
            where: {
                status: 'PENDING',
                deletedAt: null
            },
            include: {
                user: {
                    select: {
                        email: true,
                        customer: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                },
                product: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                images: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async approveReview(id: string) {
        const review = await this.prisma.review.update({
            where: { id },
            data: {
            status: 'APPROVED'
            },
            select: {
            productId: true
            }
        });
        await this.recalcProductRating(review.productId);
        return { success: true };
    }

    async rejectReview(id: string) {
        const review = await this.prisma.review.update({
            where: { id },
            data: {
            status: 'REJECTED',
            deletedAt: new Date()
            },
            select: {
            productId: true
            }
        });
        await this.recalcProductRating(review.productId);
        return { success: true };
    }

    async getReviewsByStatus(status: any) {
        return this.prisma.review.findMany({
            where: {
            status,
            deletedAt: null
            },
            orderBy: {
            createdAt: 'desc'
            },
            include: {
            product: {
                select: {
                name: true
                }
            },
            user: {
                select: {
                customer: {
                    select: {
                    firstName: true,
                    lastName: true
                    }
                }
                }
            },
            images: true
            }
        });
    }

    async updateStatus(id: string, status: any) {
        return this.prisma.review.update({
            where: { id },
            data: { status }
        });
    }

    async bulkUpdateStatus(ids: string[], status: any) {
        return this.prisma.review.updateMany({
            where: {
            id: {
                in: ids
            }
            },
            data: {
            status
            }
        });
    }

    //================= SELLER =================

    async getSellerReviews(userId: string) {

        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                storeId: true
            }
        });

        if (!user?.storeId) {
            return {
                success: true,
                message: null,
                data: {
                    data: []
                }
            };
        }

        const reviews = await this.prisma.review.findMany({
            where: {
                product: {
                    storeId: user.storeId
                }
            },
            include: {
                product: {
                    include: {
                        images: true
                    }
                },
                user: {
                    include: {
                        customer: true
                    }
                },
                images: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return reviews;

    }

}
