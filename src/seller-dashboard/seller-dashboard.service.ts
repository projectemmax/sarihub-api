/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { format, subDays } from 'date-fns';

@Injectable()
export class SellerDashboardService {
    constructor(
        private readonly prisma: PrismaService
    ) {}

    async getStats(storeId: string) {
        const validStatuses = [
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
        ];

        const orders =
            await this.prisma.orderItem.count({
                where: {
                    storeId,
                    order: {
                        status: {
                            in: validStatuses,
                        },
                    },
                },
            });

        const sales =
            await this.prisma.orderItem.aggregate({
                _sum: {
                    subtotal: true,
                },
                where: {
                    storeId,
                    order: {
                        status: {
                            in: validStatuses,
                        },
                    },
                },
            });

        const products =
            await this.prisma.product.count({
                where: {
                    storeId,
                },
            });

        return {
            orders,
            sales:
                Number(
                    sales._sum?.subtotal ?? 0
                ),
            products,
        };
    }

    async getAnalytics(
        storeId: string,
        range: string,
    ) {
        const startDate =
            range === '1D'
                ? subDays(new Date(), 1)
                : subDays(new Date(), 7);

        const rows =
            await this.prisma.orderItem.findMany({
                where: {
                    storeId,
                    order: {
                        placedAt: {
                            gte: startDate,
                        },
                        status: {
                            in: [
                                OrderStatus.PROCESSING,
                                OrderStatus.SHIPPED,
                                OrderStatus.DELIVERED,
                            ],
                        },
                    },
                },

                select: {
                    subtotal: true,

                    order: {
                        select: {
                            placedAt: true,
                        },
                    },
                },
            });

        const map =
            new Map<
                string,
                {
                    revenue: number;
                    orders: number;
                }
            >();

        rows.forEach((row) => {
            if (!row.order?.placedAt) {
                return;
            }

            const key =
                format(
                    row.order.placedAt,
                    'yyyy-MM-dd',
                );

            if (!map.has(key)) {
                map.set(key, {
                    revenue: 0,
                    orders: 0,
                });
            }

            const current =
                map.get(key)!;

            current.revenue +=
                Number(
                    row.subtotal ?? 0
                );

            current.orders += 1;
        });

        return Array.from(
            map.entries(),
        ).map(
            ([date, value]) => ({
                date,
                ...value,
            }),
        );
    }

    async getTopProducts(
        storeId: string,
    ) {
        return this.prisma.orderItem.groupBy({
            by: [
                'productId',
            ],

            where: {
                storeId,
            },

            _sum: {
                quantity: true,
            },

            orderBy: {
                _sum: {
                    quantity:
                        'desc',
                },
            },

            take: 5,
        });
    }
}