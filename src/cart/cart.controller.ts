/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Req,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CartService, CartValidationResponse } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { AuthUser } from 'src/auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
    constructor(private readonly cartService: CartService) {}

    // -------------------------
    // GET /cart
    // -------------------------
    @Get()
    async getCart(@CurrentUser() user: AuthUser) {
        const cart = await this.cartService.getDraftCart(user.id);
        return cart ?? { items: [] };
    }

    // -------------------------
    // POST /cart/items
    // -------------------------
    @Post('items')
    addItem(@Req() req: any, @Body() dto: AddCartItemDto) {
        return this.cartService.addItem(
        req.user.id,
        dto.productId,
        dto.variantId,
        dto.quantity,
        );
    }

    // -------------------------
    // DELETE /cart/items/:orderItemId
    // -------------------------
    @Delete('items/:orderItemId')
    removeItem(@Req() req: any, @Param('orderItemId') orderItemId: string) {
        return this.cartService.removeItem(req.user.id, orderItemId);
    }

    // -------------------------
    // PATCH /cart/items/:orderItemId
    // -------------------------
    @Patch('items/:orderItemId')
    updateQuantity(
        @Req() req: any,
        @Param('orderItemId') orderItemId: string,
        @Body('quantity') quantity: number,
    ) {
        return this.cartService.updateQuantity(
            req.user.id,
            orderItemId,
            quantity,
        );
    }

    // -------------------------
    // POST /cart/validate
    // -------------------------

    @Get('validate')
    validateCart(@Req() req): Promise<CartValidationResponse> {
        const userId = req.user.id;
        return this.cartService.validateCart(userId);
    }

    // -------------------------
    // DELETE /cart
    // -------------------------
    @Delete()
    clearCart(@CurrentUser() user: AuthUser) {
        return this.cartService.clearCart(user.id);
    }
}
