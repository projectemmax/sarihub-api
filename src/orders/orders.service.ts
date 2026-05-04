/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { ORDER_STATUS_TRANSITIONS } from './order-status-transition';
import { CheckoutDto } from './dto/checkout.dto';
import { RedisService } from 'src/redis/redis.service';
import { AdminOrdersQueryDto } from './dto/admin-orders-query.dto';
import { AdminUpdateOrderStatusDto } from './dto/admin-update-order-status.dto';

@Injectable()
export class OrdersService {

    private cartKey(userId: string) {
        return `cart:${userId}`;
    }

    private async clearCache(userId: string) {
        const redis = this.redisService.getClient();

        if (!redis) return;

        await redis.del(this.cartKey(userId));
    }

    constructor(
        private prisma: PrismaService,
        private redisService: RedisService
    ) {}

    async getOrderHistory(
        userId: string,
        page = 1,
        limit = 10,
    ) {
        const safeLimit = Math.min(limit, 50);
        const skip = (page - 1) * safeLimit;

        const [items, total] = await this.prisma.$transaction([
            this.prisma.order.findMany({
            where: {
                userId,
                status: {
                not: OrderStatus.DRAFT,
                },
            },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            skip,
            take: safeLimit,
            }),
            this.prisma.order.count({
                where: {
                    userId,
                    status: {
                        not: OrderStatus.DRAFT,
                    },
                },
            }),
        ]);

        return {
            data: items,
            meta: {
                page,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit),
            },
        };
    }

    async getOrderById(userId: string, orderId: string) {
        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
                status: {
                    not: OrderStatus.DRAFT,
                },
            },
            include: { items: true },
        });

        console.log(order);

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Prevent invalid transitions
        if (order.status === 'DELIVERED') {
            throw new BadRequestException('Delivered orders cannot be modified');
        }

        const allowedTransitions =
            ORDER_STATUS_TRANSITIONS[order.status];

        if (!allowedTransitions.includes(newStatus)) {
            throw new BadRequestException(
            `Invalid transition from ${order.status} to ${newStatus}`,
            );
        }

        const data: any = {
            status: newStatus,
        };

        if (newStatus === OrderStatus.SHIPPED) {
            data.shippedAt = new Date();
        }

        if (newStatus === OrderStatus.DELIVERED) {
            data.deliveredAt = new Date();
        }

        if (newStatus === OrderStatus.CANCELLED) {
            data.cancelledAt = new Date();
        }

        if (newStatus === OrderStatus.RETURNED) {
            data.returnedAt = new Date();
        }

        return this.prisma.$transaction([
            this.prisma.order.update({
                where: { id: orderId },
                data,
            }),

            this.prisma.orderStatusHistory.create({
                data: {
                    orderId,
                    status: newStatus,
                },
            }),
        ]);
    }

    async checkout(userId: string, payload: CheckoutDto) {

        const order = await this.prisma.$transaction(async (tx) => {

            // 1️⃣ Get draft cart
            const cart = await tx.order.findFirst({
            where: {
                userId,
                status: OrderStatus.DRAFT,
            },
            include: {
                items: {
                orderBy: { createdAt: 'asc' },
                },
            },
            });

            if (!cart) {
            throw new NotFoundException('Cart not found');
            }

            if (cart.items.length === 0) {
            throw new BadRequestException('Cart is empty');
            }

            // 2️⃣ Validate stock and decrement inventory
            for (const item of cart.items) {

            const updated = await tx.product.updateMany({
                where: {
                id: item.productId,
                stock: { gte: item.quantity },
                },
                data: {
                stock: { decrement: item.quantity },
                },
            });

            if (updated.count === 0) {
                throw new BadRequestException(
                `${item.productName} is out of stock`,
                );
            }
            }

            // 3️⃣ Compute final total
            const grandTotal =
            Number(cart.totalAmount) + Number(payload.shippingFee);

            // 4️⃣ Convert cart → order
            const order = await tx.order.update({
                where: { id: cart.id },
                data: {
                    orderNumber: await this.generateOrderNumber(),

                    status: OrderStatus.PLACED,
                    paymentStatus: PaymentStatus.PENDING,
                    paymentMethod: payload.paymentMethod,
                    messageForSeller: payload.messageForSeller,

                    shippingFee: payload.shippingFee,
                    shippingName: payload.shippingName,
                    shippingPhone: payload.shippingPhone,
                    shippingAddress: payload.shippingAddress,
                    shippingCity: payload.shippingCity,
                    shippingProvince: payload.shippingProvince,

                    totalAmount: grandTotal,
                    placedAt: new Date(),
                },
                include: {
                    items: {
                    orderBy: { createdAt: 'asc' },
                    },
                },
            });

            // 5️⃣ Save order status history
            await tx.orderStatusHistory.create({
            data: {
                orderId: order.id,
                status: OrderStatus.PLACED,
            },
            });

            return order;
        });

        // 6️⃣ Clear Redis cart cache
        await this.clearCache(userId);

        return order;
    }

    async getMyOrders(userId: string, page = 1, limit = 10, status?: string) {

        const safeLimit = Math.min(limit, 50);
        const skip = (page - 1) * safeLimit;

        const where: any = {
            userId,
            status: {
                not: OrderStatus.DRAFT
            }
        };

        if (status && status !== 'ALL') {
            where.status = status as OrderStatus;
        }

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take: safeLimit,
                orderBy: { createdAt: 'desc' },
                include: { items: true }
            }),
            this.prisma.order.count({ where })
        ]);

        return {
            data: orders,
            meta: {
                page,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            }
        };
    }

    async reorder(userId: string, orderId: string) {

        const previousOrder = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
                status: { not: OrderStatus.DRAFT }
            },
            include: { items: true }
        });

        if (!previousOrder) {
            throw new NotFoundException('Order not found');
        }

        // Get or create cart
        let cart = await this.prisma.order.findFirst({
            where: { userId, status: OrderStatus.DRAFT }
        });

        if (!cart) {
            cart = await this.prisma.order.create({
                data: {
                    orderNumber: `CART-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    userId,
                    status: OrderStatus.DRAFT,
                    paymentStatus: PaymentStatus.NONE,
                    totalAmount: 0
                }
            });
        }

        const results = {
            added: 0,
            skippedOutOfStock: 0,
            skippedDiscontinued: 0,
            priceChanged: 0
        };

        for (const item of previousOrder.items) {

            const product = await this.prisma.product.findUnique({
                where: { id: item.productId }
            });

            // Product removed or discontinued
            if (!product || !product.isActive) {
                results.skippedDiscontinued++;
                continue;
            }

            // Out of stock
            if (product.stock <= 0) {
                results.skippedOutOfStock++;
                continue;
            }

            // Validate quantity against stock
            const reorderQty = Math.min(item.quantity, product.stock);

            // Check existing cart item
            const existing = await this.prisma.orderItem.findUnique({
                where: {
                    orderId_productId: {
                    orderId: cart.id,
                    productId: item.productId
                    }
                }
            });

            const newQty = existing
            ? Math.min(existing.quantity + reorderQty, product.stock)
            : reorderQty;

            const priceChanged =
            Number(product.price) !== Number(item.priceSnapshot);

            if (priceChanged) {
                results.priceChanged++;
            }

            const subtotal = newQty * Number(product.price);

            await this.prisma.orderItem.upsert({
            where: {
                orderId_productId: {
                orderId: cart.id,
                productId: item.productId
                }
            },
            update: {
                quantity: newQty,
                priceSnapshot: product.price,
                subtotal
            },
            create: {
                orderId: cart.id,
                productId: product.id,
                productName: product.name,
                productImage: product.imageUrl,
                priceSnapshot: product.price,
                quantity: newQty,
                subtotal
            }
            });

            results.added++;
        }

        // Recalculate cart total
        const cartItems = await this.prisma.orderItem.findMany({
            where: { orderId: cart.id }
        });

        const total = cartItems.reduce(
            (sum, item) => sum + Number(item.subtotal),
            0
        );

        await this.prisma.order.update({
            where: { id: cart.id },
            data: { totalAmount: total }
        });

        await this.clearCache(userId);

        return {
            message: 'Reorder processed',
            results
        };
    }

    // Admin methods
    async getAdminOrders(query: AdminOrdersQueryDto) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 10);
        const skip = (page - 1) * limit;

        const where: any = {};

        if (query.status) {
            where.status = query.status;
        }

        if (query.search) {
            where.OR = [
                {
                    orderNumber: {
                        contains: query.search,
                        mode: 'insensitive',
                    },
                },
                {
                    user: {
                        email: {
                            contains: query.search,
                            mode: 'insensitive',
                        },
                    },
                },
                {
                    user: {
                        customer: {
                            firstName: {
                                contains: query.search,
                                mode: 'insensitive',
                            },
                        },
                    },
                },
                {
                    user: {
                        customer: {
                        lastName: {
                            contains: query.search,
                            mode: 'insensitive',
                        },
                        },
                    },
                },
            ];
        }

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: {
                    user: {
                        include: {
                        customer: true,
                        },
                    },
                    items: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            data: orders,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getAdminOrderById(id: string) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                user: {
                    include: {
                        customer: true,
                    },
                },
                items: {
                    include: {
                        product: {
                            include: {
                                images: {
                                    orderBy: {
                                        order: 'asc',
                                    },
                                },
                            },
                        },
                    },
                },
                statusHistory: {
                    include: {
                        changedBy: {
                            include: {
                            customer: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    async updateAdminOrderStatus(
        id: string,
        dto: AdminUpdateOrderStatusDto,
        adminId: string,
    ) {
        const order = await this.prisma.order.findUnique({
        where: { id },
        });

        if (!order) {
        throw new NotFoundException('Order not found');
        }

        const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status];

        if (!allowedTransitions.includes(dto.status)) {
        throw new BadRequestException(
            `Cannot change status from ${order.status} to ${dto.status}`,
        );
        }

        return this.prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
            where: { id },
            data: {
                status: dto.status,
                trackingNumber:
                    dto.trackingNumber ?? order.trackingNumber,
            },
        });

        await tx.orderStatusHistory.create({
            data: {
            orderId: id,
            fromStatus: order.status,
            status: dto.status,
            note: dto.remarks,
            changedById: adminId,
            },
        });

        return updatedOrder;
        });
    }

    private async generateOrderNumber(): Promise<string> {
        const today = new Date();

        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');

        const prefix = `ORD-${y}${m}${d}`;

        for (let attempt = 0; attempt < 5; attempt++) {

            const latest = await this.prisma.order.findFirst({
            where: {
                orderNumber: {
                startsWith: prefix,
                },
            },
            orderBy: {
                orderNumber: 'desc',
            },
            select: {
                orderNumber: true,
            },
            });

            const next =
            latest?.orderNumber
                ? Number(latest.orderNumber.split('-').pop()) + 1
                : 1;

            const candidate = `${prefix}-${String(next).padStart(6, '0')}`;

            const exists = await this.prisma.order.findUnique({
            where: { orderNumber: candidate },
            });

            if (!exists) {
            return candidate;
            }
        }

        throw new Error('Failed to generate unique order number');
    }

    // GET /orders/:orderId/payment-attempts
    async getPaymentAttempts(orderId: string, userId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                paymentTransaction: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!order || order.userId !== userId) {
            throw new ForbiddenException();
        }

        return order.paymentTransaction;
    }

    async createInitialPayment(orderId: string) {
        return this.prisma.paymentTransaction.create({
            data: {
                orderId,
                attemptNo: 1,
                status: 'PENDING',
                amount: 0, // replace with order total
                method: 'GCASH',
                provider: 'PAYMONGO'
            }
        });
    }

}