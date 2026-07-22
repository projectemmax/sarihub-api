/* eslint-disable prettier/prettier */
import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PayMongoProvider {
    constructor(private configService: ConfigService) {}

    private get headers() {
        const secretKey = this.configService.get<string>('PAYMONGO_SECRET_KEY');

        return {
        Authorization: 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
        'Content-Type': 'application/json',
        };
    }

    async createCheckoutSession(order: any, method: 'gcash' | 'maya' | 'card') {
        const successUrl = this.configService.get<string>('FRONTEND_SUCCESS_URL');
        const failedUrl = this.configService.get<string>('FRONTEND_FAILED_URL');

        const paymentMethods = {
            gcash: ['gcash'],
            maya: ['paymaya'],
            card: ['card'],
        };

        const response = await axios.post(
            'https://api.paymongo.com/v1/checkout_sessions',
            {
                data: {
                    attributes: {
                        send_email_receipt: false,
                        show_description: true,
                        show_line_items: true,
                        description: `Order ${order.orderNumber}`,
                        payment_method_types: paymentMethods[method],
                        line_items: [
                            {
                                currency: 'PHP',
                                amount: Math.round(Number(order.totalAmount) * 100),
                                description: `Order ${order.orderNumber}`,
                                quantity: 1,
                                name: `Order ${order.orderNumber}`,
                            },
                        ],
                        success_url: `${successUrl}?orderId=${order.id}`,
                        cancel_url: `${failedUrl}?orderId=${order.id}`,
                        metadata: {
                            orderId: order.id,
                            orderNumber: order.orderNumber,
                        },
                    },
                },
            },
            {
                headers: this.headers,
            },
        );

        const checkout = response.data.data;

        return {
            checkoutSessionId: response.data.data.id,
            redirectUrl: response.data.data.attributes.checkout_url,
            rawResponse: response.data,
        };
    }
}
