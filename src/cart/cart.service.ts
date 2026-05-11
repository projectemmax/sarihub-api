/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { RedisService } from 'src/redis/redis.service';

export type CartValidationResponse = {
  valid: boolean;
  items: {
    orderItemId: string;
    productId: string;
    variantId?: string | null;
    name: string;
    requestedQty: number;
    availableStock: number;
    valid: boolean;
    adjustedQty?: number;
    message?: string;
  }[];
};

@Injectable()
export class CartService {
  private readonly CART_TTL = 60 * 60 * 24; // 24 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // ================================
  // REDIS HELPERS
  // ================================

  private cartKey(userId: string) {
    return `cart:${userId}`;
  }

  private async cacheCart(userId: string, cart: any) {
    const redis = this.redisService.getClient();

    if (!redis) return;

    await redis.set(
      this.cartKey(userId),
      JSON.stringify(cart),
      'EX',
      this.CART_TTL,
    );
  }

  private async clearCache(userId: string) {
    const redis = this.redisService.getClient();

    if (!redis) return;

    await redis.del(this.cartKey(userId));
  }

  // ================================
  // UTILITIES
  // ================================

  private ensureDraft(status: OrderStatus) {
    if (status !== OrderStatus.DRAFT) {
      throw new BadRequestException('Cart can no longer be modified');
    }
  }

  private calculateTotal(items: { subtotal: any }[]) {
    return items.reduce((sum, i) => sum + Number(i.subtotal), 0);
  }

  private getVariantLabel(attributes: any): string | null {
    if (!attributes) return null;

    if (Array.isArray(attributes)) {
      return attributes.filter(Boolean).join(' / ') || null;
    }

    if (typeof attributes === 'object') {
      return Object.values(attributes).filter(Boolean).join(' / ') || null;
    }

    return String(attributes);
  }

  // ================================
  // GET CART (CACHE FIRST)
  // ================================

  async getDraftCart(userId: string) {
    const redis = this.redisService.getClient();
    const cache = await redis.get(this.cartKey(userId));

    if (cache) {
      return JSON.parse(cache);
    }

    const cart = await this.prisma.order.findFirst({
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

    if (cart) {
      await this.cacheCart(userId, cart);
    }

    return cart;
  }

  // ================================
  // CREATE OR GET CART
  // ================================

  private generateOrderNumber(prefix = 'ORD') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  private async getOrCreateCart(tx: any, userId: string) {
    let cart = await tx.order.findFirst({
      where: {
        userId,
        status: OrderStatus.DRAFT,
      },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!cart) {
      cart = await tx.order.create({
        data: {
          userId,
          orderNumber: this.generateOrderNumber('CART'),
          status: OrderStatus.DRAFT,
          paymentStatus: PaymentStatus.NONE,
          totalAmount: 0,
        },
        include: {
          items: { orderBy: { createdAt: 'asc' } },
        },
      });
    }

    return cart;
  }

  // ================================
  // ADD ITEM
  // ================================

  async addItem(
    userId: string,
    productId: string,
    variantId: string | undefined,
    quantity: number,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await this.getOrCreateCart(tx, userId);
      this.ensureDraft(cart.status);

      const product = await tx.product.findUnique({
        where: { id: productId },
        include:{
            images: {
                orderBy:{ order: 'asc' },
                take: 1,
            },
            variants: true,
        }
      });

      if (!product) throw new NotFoundException('Product not found');

      const variant = variantId
        ? product.variants.find((item) => item.id === variantId)
        : null;

      if (variantId && !variant) {
        throw new BadRequestException('Selected variant is invalid');
      }

      if (product.variants.length > 0 && !variant) {
        throw new BadRequestException('Please select a product variant');
      }

      const stock = variant ? variant.stock : product.stock;
      const price = variant ? variant.price : product.price;
      const productImage =
        variant?.image ??
        product.images?.[0]?.url ??
        product.imageUrl ??
        null;

      const existingItem = await tx.orderItem.findFirst({
        where: {
          orderId: cart.id,
          productId,
          variantId: variant?.id ?? null,
        },
      });

      const newQty = existingItem
        ? existingItem.quantity + quantity
        : quantity;

      // 🔥 STOCK GUARD (backend-level safety)
      if (newQty > stock) {
        throw new BadRequestException(
          `Only ${stock} items available`,
        );
      }

      if (existingItem) {
        await tx.orderItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQty,
            subtotal: newQty * Number(existingItem.priceSnapshot),
          },
        });
      } else {
        await tx.orderItem.create({
          data: {
            orderId: cart.id,
            productId,
            variantId: variant?.id,
            productName: product.name,
            variantName: this.getVariantLabel(variant?.attributes),
            variantSku: variant?.sku,
            ...(variant?.attributes && {
              variantAttributes: variant.attributes as any,
            }),
            productImage,
            priceSnapshot: price,
            quantity,
            subtotal: quantity * Number(price),
          },
        });
      }

      const items = await tx.orderItem.findMany({
        where: { orderId: cart.id },
      });

      return tx.order.update({
        where: { id: cart.id },
        data: {
          totalAmount: this.calculateTotal(items),
        },
        include: {
          items: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    await this.cacheCart(userId, order);
    return order;
  }

  // ================================
  // UPDATE QUANTITY
  // ================================

  async updateQuantity(
    userId: string,
    orderItemId: string,
    quantity: number,
  ) {
    if (quantity < 0) {
      throw new BadRequestException('Invalid quantity');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.order.findFirst({
        where: { userId, status: OrderStatus.DRAFT },
      });

      if (!cart) throw new NotFoundException('Cart not found');

      const item = await tx.orderItem.findUnique({
        where: { id: orderItemId },
      });

      if (!item) throw new NotFoundException('Item not found');

      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      const variant = item.variantId
        ? await tx.productVariant.findUnique({
            where: { id: item.variantId },
          })
        : null;

      const stock = variant?.stock ?? product?.stock ?? 0;

      if (quantity > stock) {
        throw new BadRequestException(`Only ${stock} items available`);
      }

      if (quantity === 0) {
        await tx.orderItem.delete({ where: { id: orderItemId } });
      } else {
        await tx.orderItem.update({
          where: { id: orderItemId },
          data: {
            quantity,
            subtotal: quantity * Number(item.priceSnapshot),
          },
        });
      }

      const items = await tx.orderItem.findMany({
        where: { orderId: cart.id },
      });

      return tx.order.update({
        where: { id: cart.id },
        data: {
          totalAmount: this.calculateTotal(items),
        },
        include: {
          items: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    await this.cacheCart(userId, order);
    return order;
  }

  // ================================
  // VALIDATE CART (SHOPEE-STYLE)
  // ================================

  async validateCart(userId: string): Promise<CartValidationResponse> {
    const cart = await this.prisma.order.findFirst({
      where: {
        userId,
        status: OrderStatus.DRAFT,
      },
      include: {
        items: true,
      },
    });

    if (!cart) return { valid: true, items: [] };

    const validatedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });

        const variant = item.variantId
          ? await this.prisma.productVariant.findUnique({
              where: { id: item.variantId },
            })
          : null;

        const stock = variant?.stock ?? product?.stock ?? 0;

        if (stock === 0) {
          return {
            orderItemId: item.id,
            productId: item.productId,
            variantId: item.variantId,
            name: item.productName,
            requestedQty: item.quantity,
            availableStock: 0,
            valid: false,
            message: 'Out of stock',
          };
        }

        if (item.quantity > stock) {
          return {
            orderItemId: item.id,
            productId: item.productId,
            variantId: item.variantId,
            name: item.productName,
            requestedQty: item.quantity,
            availableStock: stock,
            valid: false,
            adjustedQty: stock,
            message: `Only ${stock} left`,
          };
        }

        return {
          orderItemId: item.id,
          productId: item.productId,
          variantId: item.variantId,
          name: item.productName,
          requestedQty: item.quantity,
          availableStock: stock,
          valid: true,
        };
      }),
    );

    return {
      valid: validatedItems.every((i) => i.valid),
      items: validatedItems,
    };
  }

  // ================================
  // REMOVE ITEM
  // ================================

  async removeItem(userId: string, orderItemId: string) {
    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.order.findFirst({
        where: { userId, status: OrderStatus.DRAFT },
        include: { items: true },
      });

      if (!cart) throw new NotFoundException('Cart not found');

      const item = cart.items.find((i) => i.id === orderItemId);
      if (!item) throw new NotFoundException('Item not found');

      await tx.orderItem.delete({ where: { id: item.id } });

      const items = await tx.orderItem.findMany({
        where: { orderId: cart.id },
      });

      return tx.order.update({
        where: { id: cart.id },
        data: {
          totalAmount: this.calculateTotal(items),
        },
        include: {
          items: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    await this.cacheCart(userId, order);
    return order;
  }

  // ================================
  // CLEAR CART
  // ================================

  async clearCart(userId: string) {
    await this.prisma.order.deleteMany({
      where: {
        userId,
        status: OrderStatus.DRAFT,
      },
    });

    await this.clearCache(userId);

    return { message: 'Cart cleared successfully' };
  }
}
