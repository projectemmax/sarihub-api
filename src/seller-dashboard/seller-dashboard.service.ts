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

    range: string,
) {

    const analytics =
        await this.aggregate
            .getRevenueTimeline(

                storeId,

                range as

                '1D'
                | '7D'
                | '1M'
                | '1Y',
            );

    const totalRevenue =
        analytics.timeline.reduce(

            (
                sum,

                row,
            ) =>

                sum +
                row.revenue,

            0,
        );

    const totalOrders =
        analytics.timeline.reduce(

            (
                sum,

                row,
            ) =>

                sum +
                row.orders,

            0,
        );

    return {

        data: {

            timeline:

                analytics.timeline,

            totalRevenue,

            totalOrders,

            growth:

                analytics
                    .revenueGrowth
                    ?.growth
                ??
                0,

            revenueGrowth:

                analytics
                    .revenueGrowth,

            period:

                analytics
                    .period,
        },
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
                images:
                    r.product?.images?.length
                        ? r.product.images.map(
                            img => ({
                                url: img.url,
                            }),
                        )
                        : r.product?.imageUrl
                            ? [
                                {
                                    url: r.product.imageUrl,
                                },
                            ]
                            : [],

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