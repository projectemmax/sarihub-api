/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { PayMongoProvider } from './providers/paymongo.provider';
import { CodProvider } from './providers/cod.provider';
import { Cron } from '@nestjs/schedule';


@Injectable()
export class PaymentService {
    constructor(
        private prisma: PrismaService,
        private payMongoProvider: PayMongoProvider,
        private codProvider: CodProvider,
    ) {}

    async createPayment(
        dto: CreatePaymentIntentDto,
        userId?: string,
        forceNew = false
    ) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
        });

        if (!order) throw new BadRequestException('Order not found');

        if (userId && order.userId !== userId) {
            throw new BadRequestException('Unauthorized');
        }

        // 🔥 reuse helper
        if (!forceNew) {
            const existing = await this.getLatestPending(dto.orderId);

            if (existing) {
                return {
                paymentId: existing.id,
                redirectUrl: existing.redirectUrl,
                paymentStatus: existing.status,
                };
            }
        }

        const count = await this.prisma.paymentTransaction.count({
            where: { orderId: dto.orderId },
        });

        const attemptNo = count + 1;

        const gateway = await this.createGatewaySession(order, dto.paymentMethod);

        const data = {
            orderId: order.id,
            attemptNo,
            provider: gateway.provider,
            method: dto.paymentMethod,
            status: PaymentStatus.PENDING,
            amount: order.totalAmount,
            checkoutSessionId: gateway.checkoutSessionId,
            redirectUrl: gateway.redirectUrl,
            rawResponse: gateway.rawResponse,
        };

        let payment;

        try {
            payment = await this.prisma.paymentTransaction.create({
                data,
            });
        } catch (e) {
            // 🔥 Handle unique constraint collision (race condition)
            const count = await this.prisma.paymentTransaction.count({
                where: { orderId: dto.orderId },
            });

            const retryAttemptNo = count + 1;

            payment = await this.prisma.paymentTransaction.create({
                data: {
                    ...data,
                    attemptNo: retryAttemptNo,
                },
            });
        }

        return {
            paymentId: payment.id,
            redirectUrl: payment.redirectUrl,
            paymentStatus: payment.status,
        };
    }

    async retryPayment(orderId: string, userId: string, method?: PaymentMethod) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) throw new BadRequestException('Order not found');
        if (order.userId !== userId) throw new BadRequestException('Unauthorized');

        if (order.paymentStatus === PaymentStatus.PAID) {
            throw new BadRequestException('Order already paid');
        }

        // 🔥 single source of truth
        return this.createPayment(
            {
                orderId,
                paymentMethod: method || PaymentMethod.GCASH,
            },
            userId,
            true
        );
    }

    async markPaymentPaid(checkoutSessionId: string, payload: any) {

        const payment = await this.prisma.paymentTransaction.findFirst({
            where: { checkoutSessionId },
            include: { order: true },
        });

        if (!payment) return;

        await this.prisma.$transaction([
            this.prisma.paymentTransaction.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.PAID,
                    paidAt: new Date(),
                    webhookPayload: payload,
                },
            }),

            this.prisma.order.update({
                where: { id: payment.orderId },
                data: {
                    paymentStatus: PaymentStatus.PAID,
                },
            }),

            this.prisma.paymentTransactionLog.create({
                data: {
                    paymentId: payment.id,
                    eventType: 'payment.paid',
                    payload,
                },
            }),
        ]);
    }

    async markPaymentFailed(checkoutSessionId: string, payload: any) {
        const payment = await this.prisma.paymentTransaction.findFirst({
        where: { checkoutSessionId },
        });

        if (!payment) return;

        await this.prisma.$transaction([
            this.prisma.paymentTransaction.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.FAILED,
                    failedAt: new Date(),
                    webhookPayload: payload,
                },
            }),

            this.prisma.order.update({
                where: { id: payment.orderId },
                data: {
                    paymentStatus: PaymentStatus.FAILED,
                },
            }),

            this.prisma.paymentTransactionLog.create({
                data: {
                    paymentId: payment.id,
                    eventType: 'payment.failed',
                    payload,
                },
            }),
        ]);
    }

    async getAttempts(orderId: string) {
        return this.prisma.paymentTransaction.findMany({
            where: { orderId },
            orderBy: { attemptNo: 'desc' }
        });
    }

    private async getLatestPending(orderId: string) {
        return this.prisma.paymentTransaction.findFirst({
            where: {
                orderId,
                status: PaymentStatus.PENDING,
                redirectUrl: { not: null },
                expiredAt: null,
            },
            orderBy: { attemptNo: 'desc' },
        });
    }

    private async createGatewaySession(order, method: PaymentMethod) {
        if (method === PaymentMethod.COD) {
            const result = await this.codProvider.createPayment(order);

            return {
                provider: PaymentProvider.COD,
                checkoutSessionId: null,
                redirectUrl: null,
                rawResponse: result.rawResponse,
            };
        }

        const map: Record<'GCASH' | 'MAYA' | 'CARD', 'gcash' | 'maya' | 'card'> = {
            GCASH: 'gcash',
            MAYA: 'maya',
            CARD: 'card',
        };

        const result = await this.payMongoProvider.createCheckoutSession(
            order,
            map[method as 'GCASH' | 'MAYA' | 'CARD']
        );

        return {
            provider: PaymentProvider.PAYMONGO,
            checkoutSessionId: result.checkoutSessionId,
            redirectUrl: result.redirectUrl,
            rawResponse: result.rawResponse,
        };
    }

    @Cron('*/5 * * * *')
    async expirePayments() {
        const now = new Date();

        await this.prisma.paymentTransaction.updateMany({
            where: {
                status: 'PENDING',
                createdAt: {
                    lt: new Date(now.getTime() - 15 * 60 * 1000),
                },
            },
            data: {
                status: 'EXPIRED',
                expiredAt: now,
            },
        });
    }

}