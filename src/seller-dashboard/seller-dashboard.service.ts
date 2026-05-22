/* eslint-disable prettier/prettier */
import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SellerDashboardService {

    constructor(
        private prisma: PrismaService,
    ) {}

    private async getStoreId(
        userId: string,
    ) {

        const user =
        await this.prisma.user.findUnique({
            where: {
            id: userId,
            },

            select: {
            storeId: true,
            },
        });

        if (!user?.storeId) {
        throw new ForbiddenException(
            'Seller store missing',
        );
        }

        return user.storeId;
    }

    async stats(
        userId: string,
    ) {

        const storeId =
        await this.getStoreId(
            userId,
        );

        return {
        data: {
            orders:
            await this.prisma.order.count({
                where: {
                storeId,
                },
            }),

            sales: 0,

            customers: 0,

            pendingReviews: 0,
        },
        };
    }

    async analytics(
        userId: string,
        range: string,
    ) {

        await this.getStoreId(
        userId,
        );

        return {
        data: {
            timeline: [],
            totalRevenue: 0,
            totalOrders: 0,
            growth: 0,
        },
        };
    }

    async topProducts(
        userId: string,
    ) {

        await this.getStoreId(
        userId,
        );

        return {
        data: [],
        };
    }

    async latestCustomers(
        userId: string,
    ) {

        await this.getStoreId(
        userId,
        );

        return {
        data: [],
        };
    }

    async pendingReviews(
        userId: string,
    ) {

        await this.getStoreId(
        userId,
        );

        return {
        data: [],
        };
    }

}