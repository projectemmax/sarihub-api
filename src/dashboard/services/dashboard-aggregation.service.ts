/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardRange, resolveRange } from '../utils/analytics-period.util';

@Injectable()
export class DashboardAggregationService {

    constructor(
        private prisma: PrismaService
    ) {}

    async getMetrics(storeId?: string) {
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

    storeId?: string,
) {

    const start =
        new Date();

    switch (
        period
    ) {

        case '1D':

            start.setDate(
                start.getDate() - 1,
            );

            break;

        case '7D':

            start.setDate(
                start.getDate() - 7,
            );

            break;

        case '1M':

            start.setMonth(
                start.getMonth() - 1,
            );

            break;

        case '1Y':

            start.setFullYear(
                start.getFullYear() - 1,
            );
    }

    const productIds =
        storeId

            ? (
                await this.prisma.product.findMany({

                    where: {
                        storeId,
                    },

                    select: {
                        id:
                            true,
                    },
                })
            ).map(
                (
                    p,
                ) =>
                    p.id,
            )

            : [];

    return this.prisma.orderItem.findMany({

        where: {

            ...(storeId && {

                productId: {

                    in:
                    productIds,
                },
            }),

            createdAt: {

                gte:
                    start,
            },
        },

        select: {

            orderId:
                true,

            createdAt:
                true,

            subtotal:
                true,
        },

        orderBy: {

            createdAt:
                'asc',
        },
    });
}

    async getTopProducts(
        storeId?: string
    ) {

        return this.prisma.orderItem.groupBy({

            by: [
                'productId'
            ],

            where: {

                ...(storeId && {

                    product: {
                        storeId
                    }
                })
            },

            _sum: {
                quantity: true
            },

            orderBy: {

                _sum: {
                    quantity: 'desc'
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
        range: DashboardRange = '7D',
    ) {
        const period = resolveRange(range);
        const productIds =
            storeId
                ? (
                    await this.prisma.product.findMany({
                        where: {
                            storeId,
                        },

                        select: {
                            id: true,
                        },
                    })
                ).map(
                    p => p.id,
                )
                : [];

        const baseWhere = {

            ...(storeId && {
                productId: {
                    in: productIds,
                },
            }),
        };

        const [
            current,
            previous,
        ] = await Promise.all([

            this.prisma.orderItem.findMany({
                where: {
                    ...baseWhere,
                    createdAt: {
                        gte: period.currentStart,
                        lte: period.currentEnd,
                    },
                },

                select: {
                    orderId: true,
                    createdAt: true,
                    subtotal: true,
                },

                orderBy: {
                    createdAt: 'asc',
                },
            }),

            this.prisma.orderItem.findMany({
                where: {
                    ...baseWhere,
                    createdAt: {
                        gte: period.previousStart,
                        lt: period.previousEnd,
                    },
                },

                select: {
                    createdAt: true,
                    subtotal: true,
                },
            }),

        ]);

        const currentRevenue =
            current.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.subtotal ?? 0,
                    ),
                0,
            );

        const previousRevenue =
            previous.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.subtotal ?? 0,
                    ),
                0,
            );

        const revenueGrowth =
    this.calculateGrowth(
        currentRevenue,
        previousRevenue,
    );


    const grouped =
        new Map<
            string,
            {

                revenue:
                    number;

                orders:
                    number;

                orderIds:
                    Set<string>;
            }
        >();

current.forEach(
    (item) => {

        const date =
            item.createdAt
                .toISOString()
                .split('T')[0];

        if (
            !grouped.has(
                date,
            )
        ) {

            grouped.set(
                date,

                {
                    revenue: 0,
                    orders: 0,
                    orderIds: new Set(),
                },
            );
        }

        const row =
            grouped.get(
                date,
            )!;

        row.revenue +=
            Number(
                item.subtotal ?? 0,
            );

        row.orderIds.add(
            item.orderId,
        );

        row.orders =
            row.orderIds.size;
            },
        );

const timeline =
    Array.from(
        grouped.entries(),
    ).map(
        (
            [
                date,
                values,
            ],
        ) => ({

            date,

            revenue:
                values.revenue,

            orders:
                values.orders,
        }),
    );

return {

    timeline,

    revenueGrowth: {

        current:
            currentRevenue,

        previous:
            previousRevenue,

        growth:
            revenueGrowth,
    },

    period,
};
    }

    private calculateGrowth(
        current: number,
        previous: number,
    ) {

        if (
            previous === 0
        ) {

            return current > 0
                ? 100
                : 0;
        }

        return Number(
            (
                (
                    (current - previous)
                    /
                    previous
                ) * 100
            ).toFixed(2),
        );
    }

    


}