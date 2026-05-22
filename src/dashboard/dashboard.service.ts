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

        console.log(
            'STORE ID RECEIVED =>',
            storeId
        );

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

    async getAnalytics(range: string) {
        const { startDate, prevStartDate } = this.getDateRange(range);

        const validStatuses: OrderStatus[] = [
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
        ];

        const sales = await this.prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: {
                status: { in: validStatuses },
                placedAt: { gte: startDate, not: null }
            }
        });

        // CURRENT PERIOD
        const orders = await this.prisma.order.findMany({
            where: {
                status: { in: validStatuses },
                placedAt: { gte: startDate, not: null }
            },
            select: {
                placedAt: true,
                totalAmount: true
            }
        });

        // PREVIOUS PERIOD
        const prevOrders = await this.prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: {
                status: { in: validStatuses },
                placedAt: {
                    not: null,
                    gte: prevStartDate,
                    lt: startDate
                }
            }
        });

        const timeline = this.buildTimeline(orders, range);

        const totalRevenue = timeline.reduce((sum, d) => sum + d.revenue, 0);
        const totalOrders = timeline.reduce((sum, d) => sum + d.orders, 0);

        const prevRevenue = Number(prevOrders._sum?.totalAmount || 0);

        const growth =
            prevRevenue === 0
                ? (totalRevenue > 0 ? 100 : 0)
                : ((totalRevenue - prevRevenue) / prevRevenue) * 100;

        return {
            timeline,
            totalRevenue,
            totalOrders,
            growth: Number(growth.toFixed(2))
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

    private buildTimeline(orders: any[], range: string) {
        const map = new Map<string, { revenue: number; orders: number }>();

        for (const order of orders) {
            if (!order.placedAt) continue;

            const key = format(order.placedAt, 'yyyy-MM-dd');

            if (!map.has(key)) {
            map.set(key, { revenue: 0, orders: 0 });
            }

            const entry = map.get(key)!;
            entry.revenue += Number(order.totalAmount ?? 0);
            entry.orders += 1;
        }

        const dates = this.generateDateSeries(range);

        return dates.map(date => ({
            date,
            revenue: map.get(date)?.revenue || 0,
            orders: map.get(date)?.orders || 0
        }));
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

    private generateDateSeries(range: string): string[] {
        const dates: string[] = [];
        const now = new Date();

        let days = 7;

        switch (range) {
            case '1D':
            days = 1;
            break;
            case '7D':
            days = 7;
            break;
            case '1M':
            days = 30;
            break;
            case '1Y':
            days = 365;
            break;
        }

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            dates.push(format(d, 'yyyy-MM-dd'));
        }

        return dates;
    }

    private normalizeTimeline(data: any[], range: string) {
        const map = new Map();

        data.forEach(d => {
            const key = format(d.createdAt, 'yyyy-MM-dd');
            map.set(key, {
            revenue: d._sum.totalAmount || 0,
            orders: d._count.id || 0
            });
        });

        const days = this.generateDateSeries(range);

        return days.map(date => ({
            date,
            revenue: map.get(date)?.revenue || 0,
            orders: map.get(date)?.orders || 0
        }));
    }

    async getSellerDashboard(
        storeId: string
        ) {

        const [
            metrics,
            analytics,
            topProducts
        ] = await Promise.all([

            this.aggregate.getMetrics(
            storeId
            ),

            this.aggregate.getAnalytics(
            '7D',
            storeId
            ),

            this.aggregate.getTopProducts(
            storeId
            )
        ]);

        return {
            metrics,
            analytics,
            topProducts
        };
    }

    async getAdminDashboard() {
        return this.aggregate.getMetrics();
    }

}
