/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardRange, resolveRange } from '../utils/analytics-period.util';

@Injectable()
export class DashboardAggregationService {

    constructor(
        private prisma: PrismaService
    ) {}

    async getMetrics(
        storeId?: string
    ) {

        const productIds =
            storeId
                ? (
                    await this.prisma.product.findMany({
                        where: {
                            storeId
                        },
                        select: {
                            id: true
                        }
                    })
                ).map(
                    p => p.id
                )
                : [];

        const orderItemWhere =
            storeId
                ? {
                    productId: {
                        in: productIds
                    }
                }
                : {};

        const [
            orders,
            sales,
            customers,
            pendingReviews
        ] = await Promise.all([

            this.prisma.orderItem.findMany({

                where: orderItemWhere,

                distinct: [
                    'orderId'
                ],

                select: {
                    orderId: true
                }
            }),

            this.prisma.orderItem.aggregate({

                where: orderItemWhere,

                _sum: {
                    subtotal: true
                }
            }),

            this.prisma.order.findMany({

                distinct: [
                    'userId'
                ],

                select: {
                    userId: true
                }
            }),

            this.prisma.review.count({

                where:
                    storeId
                        ? {
                            productId: {
                                in: productIds
                            }
                        }
                        : {}
            })
        ]);

        return {

            orders:
                orders.length,

            sales:
                Number(
                    sales._sum?.subtotal ?? 0
                ),

            customers:
                customers.length,

            pendingReviews
        };
    }

    async getAnalytics(
        period:
            '1D'
            | '7D'
            | '1M'
            | '1Y',

        storeId?: string
    ) {

        const start =
            new Date();

        switch (
            period
        ) {

            case '1D':
                start.setDate(
                    start.getDate() - 1
                );
                break;

            case '7D':
                start.setDate(
                    start.getDate() - 7
                );
                break;

            case '1M':
                start.setMonth(
                    start.getMonth() - 1
                );
                break;

            case '1Y':
                start.setFullYear(
                    start.getFullYear() - 1
                );
        }

        const productIds =
            storeId
                ? (
                    await this.prisma.product.findMany({

                        where: {
                            storeId
                        },

                        select: {
                            id: true
                        }
                    })
                ).map(
                    p => p.id
                )
                : [];

        return this.prisma.orderItem.findMany({

            where: {

                ...(storeId && {

                    productId: {
                        in:
                            productIds
                    }
                }),

                createdAt: {
                    gte:
                        start
                }
            },

            select: {

                createdAt:
                    true,

                subtotal:
                    true
            },

            orderBy: {

                createdAt:
                    'asc'
            }
        });
    }

    async getTopProducts(
        storeId?: string
    ) {

        const productIds =
            storeId
                ? (
                    await this.prisma.product.findMany({

                        where: {
                            storeId
                        },

                        select: {
                            id: true
                        }
                    })
                ).map(
                    p => p.id
                )
                : [];

        return this.prisma.orderItem.groupBy({

            by: [
                'productId'
            ],

            where: {

                ...(storeId && {

                    productId: {
                        in:
                            productIds
                    }
                })
            },

            _sum: {

                quantity:
                    true
            },

            orderBy: {

                _sum: {

                    quantity:
                        'desc'
                }
            },

            take: 5
        });
    }

    private buildGroupFormat(
        range: DashboardRange,
    ) {
        switch (range) {

            case '1D':
            return 'hour';

            case '7D':
            return 'day';

            case '1M':
            return 'day';

            case '1Y':
            return 'month';

        }
    }

    async getRevenueTimeline(
        storeId?: string,
        range: DashboardRange='7D',
    ) {
        const period = resolveRange(range);
        const orders = await this.prisma.order.findMany({
            where: {
                storeId,
                createdAt: {
                    gte: period.currentStart,
                    lte: period.currentEnd,
                },
                status: 'COMPLETED',
            },
            select: {
                createdAt: true,
                totalAmount: true,
            },
            orderBy:{
                createdAt:'asc'
            },
        });

        return {
            orders,
            period
        };
    }


}