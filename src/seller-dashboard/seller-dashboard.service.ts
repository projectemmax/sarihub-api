/* eslint-disable prettier/prettier */

import {
  Injectable,
} from '@nestjs/common';

import { DashboardAggregationService } from '../dashboard/services/dashboard-aggregation.service';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class SellerDashboardService {

    constructor(
        private aggregate:
        DashboardAggregationService,
        private prisma: PrismaService
    ) {}

    async stats(
        storeId: string
    ) {

        const metrics =
        await this.aggregate
            .getMetrics(
            storeId
            );

        return {
        data:
            metrics
        };
    }

    async analytics(
        storeId: string,

        range: string
    ) {

        const timeline =
        await this.aggregate
            .getAnalytics(
            range as
            '1D'
            | '7D'
            | '1M'
            | '1Y',

            storeId
            );

        return {

        data: {

            timeline,

            totalRevenue:
            timeline.reduce(
                (
                a,
                b
                ) =>
                a +
                Number(
                    b.subtotal ??
                    0
                ),

                0
            ),

            totalOrders:
            timeline.length,

            growth:
            0
        }
        };
    }

    async topProducts(storeId: string) {

        const rows =
            await this.aggregate.getTopProducts(
            storeId
            );

        const products =
            await Promise.all(
            rows.map(async (r) => {

                const product =
                await this.prisma.product.findUnique({
                    where: {
                    id: r.productId,
                    },
                    select: {
                    name: true,
                    },
                });

                return {
                name: product?.name ?? 'Unknown',
                sold: Number(r._sum?.quantity ?? 0),
                };
            })
            );

        return {
            data: products,
        };
    }

    async latestCustomers(
        storeId: string
    ) {

        const metrics =
        await this.aggregate
            .getMetrics(
            storeId
            );

        return {
        data:
        metrics
        };
    }

    async pendingReviews(
        storeId: string
    ) {

        const rows =
        await this.prisma.review.findMany({
            take: 10,
            orderBy: {
                createdAt:
                'desc'
            },
            where: {
                product: {
                    storeId
                }
            },
            include: {
                product: {
                    select: {
                        name: true,
                        imageUrl: true,
                        images: true
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
                }
            }
        });

        return {
            data: rows.map((r) => ({
                ...r,

                // Match Admin response shape
                images: r.product?.imageUrl
                ? [
                    {
                        url: r.product.imageUrl,
                    },
                    ]
                : (
                    r.product?.images?.map((img) => ({
                        url: img.url,
                    })) ?? []
                    ),

                user: {
                customer: {
                    firstName: r.user?.customer?.firstName,
                    lastName: r.user?.customer?.lastName,
                },
                },
            })),
        };
    }
}