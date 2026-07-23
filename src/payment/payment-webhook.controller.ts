/* eslint-disable prettier/prettier */
import {
  Controller,
  Headers,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { verifyPayMongoSignature } from '../common/utils/webhook-signature.util';

@Controller('payments/webhook')
export class PaymentWebhookController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly configService: ConfigService,
    ) {}

    @Post('paymongo')
    async paymongoWebhook(
        @Req() req,
        @Headers('paymongo-signature') signature: string,
    ) {
        const rawBody =
            Buffer.isBuffer(req.body)
                ? req.body.toString('utf8')
                : JSON.stringify(req.body);

        const secret = this.configService.get<string>('PAYMONGO_WEBHOOK_SECRET');

        if (!secret) {
            throw new Error('PAYMONGO_WEBHOOK_SECRET is missing');
        }

        if (!signature) {
            throw new UnauthorizedException('Missing PayMongo signature');
        }

        // const isValid = verifyPayMongoSignature(rawBody, signature, secret);

        // if (!isValid) {
        // throw new UnauthorizedException('Invalid webhook signature');
        // }

        const payload = JSON.parse(rawBody);

        const eventType = payload.data.attributes.type;
        const checkoutSessionId = payload.data.attributes.data.id;

        if (eventType === 'checkout_session.payment.paid') {
            await this.paymentService.markPaymentPaid(checkoutSessionId, payload);
        }

        if (eventType === 'payment.failed') {
            await this.paymentService.markPaymentFailed(checkoutSessionId, payload);
        }

        return {
            received: true,
        };
    }
}