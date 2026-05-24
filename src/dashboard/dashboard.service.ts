/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { DashboardAggregationService } from './services/dashboard-aggregation.service';



@Injectable()
export class DashboardService {

    constructor(
        private readonly prisma: PrismaService,
        private aggregate: DashboardAggregationService
    ) {}

    async getStats(
        storeId?: string
    ) {

        if (storeId) {

            return this.aggregate
                .getMetrics(
                    storeId
                );
        }

        const totalOrders =
            await this.prisma.order.count();

        const totalCustomers =
            await this.prisma.user.count({

                where: {
                    role:
                    'CUSTOMER'
                }
            });

        const pendingReviews =
            await this.prisma.review.count({

                where: {
                    status:
                    'PENDING'
                }
            });

        const sales =
            await this.prisma.order.aggregate({

                _sum: {
                    totalAmount:
                    true
                }
            });

        return {

            orders:
                totalOrders,

            customers:
                totalCustomers,

            sales:
                sales._sum
                    .totalAmount || 0,

            pendingReviews
        };
    }

    async getAnalytics(
    range: string,
) {

    const raw =
        await this.aggregate
            .getAnalytics(

                range as

                '1D'
                | '7D'
                | '1M'
                | '1Y',
            );

    const grouped =
    new Map<
        string,
        {
            revenue: number;
            orders: number;
            orderIds: Set<string>;
        }
    >();

    raw.forEach(
        (
            row,
        ) => {

            const date =
                format(
                    row.createdAt,

                    'yyyy-MM-dd',
                );

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

            const item =
                grouped.get(
                    date,
                )!;

            item.revenue +=
                Number(
                    row.subtotal ??
                    0,
                );

            item.orderIds
            .add(
                row.orderId,
            );

            item.orders =
                item.orderIds
                    .size;
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

    const totalRevenue =
        timeline.reduce(

            (
                sum,

                item,
            ) =>

                sum +
                item.revenue,

            0,
        );

    const totalOrders =
    timeline.reduce(

        (
            sum,

            item,
        ) =>

            sum +
            item.orders,

        0,
    );

const {
    prevStartDate,
    startDate,
} =
this.getDateRange(
    range,
);

const previous =
    await this.prisma.order.aggregate({

        _sum: {

            totalAmount:
                true,
        },

        where: {

            status: {

                in: [

                    OrderStatus.PROCESSING,

                    OrderStatus.SHIPPED,

                    OrderStatus.DELIVERED,
                ],
            },

            placedAt: {

                gte:
                    prevStartDate,

                lt:
                    startDate,

                not:
                    null,
            },
        },
    });

const previousRevenue =
    Number(
        previous
            ._sum
            ?.totalAmount
        ??
        0,
    );

const growth =

    previousRevenue === 0

        ? (
            totalRevenue > 0
                ? 100
                : 0
        )

        : Number(

            (
                (
                    (
                        totalRevenue
                        -
                        previousRevenue
                    )
                    /
                    previousRevenue
                )
                *
                100
            ).toFixed(
                2,
            ),
        );

return {

    timeline,

    totalRevenue,

    totalOrders,

    growth,
};
}

    async getTopProducts() {
        const products = await this.prisma.orderItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true },
            orderBy: {
                _sum: { quantity: 'desc' }
            },
            take: 5,
            where: {
                order: {
                    status: {
                        in: [
                        OrderStatus.PROCESSING,
                        OrderStatus.SHIPPED,
                        OrderStatus.DELIVERED
                        ]
                    },
                    placedAt: {
                        not: null
                    }
                }
            }
        });

        const productIds = products.map(p => p.productId);

        const productDetails = await this.prisma.product.findMany({
            where: {
                id: { in: productIds },
            },
            select: {
                id: true,
                name: true
            }
        });

        const productMap = new Map(productDetails.map(p => [p.id, p]));

        return products.map(p => ({
        productId: p.productId,
        name: productMap.get(p.productId)?.name,
        sold: p._sum.quantity
        }));
    }

    async getLatestCustomers() {
        return this.prisma.user.findMany({
            where: {
                role: 'CUSTOMER'
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5,
            select: {
                id: true,
                email: true,
                customer: {
                    select: {
                    firstName: true,
                    lastName: true
                    }
                }
            }
        });
    }

    async getPendingReviews() {
        return this.prisma.review.findMany({
            where: {
            status: 'PENDING'
            },
            take: 5,
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
            images: {
                select: {
                url: true
                }
            }
            }
        });
    }

    private getDateRange(range: string) {
        const now = new Date();

        switch (range) {
            case '1D':
            return {
                startDate: subDays(now, 1),
                prevStartDate: subDays(now, 2),
            };
            case '7D':
            return {
                startDate: subDays(now, 7),
                prevStartDate: subDays(now, 14),
            };
            case '1M':
            return {
                startDate: subMonths(now, 1),
                prevStartDate: subMonths(now, 2),
            };
            case '1Y':
            return {
                startDate: subYears(now, 1),
                prevStartDate: subYears(now, 2),
            };
            default:
            return {
                startDate: subDays(now, 7),
                prevStartDate: subDays(now, 14),
            };
        }
    }


}
