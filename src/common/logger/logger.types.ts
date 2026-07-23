export interface LogContext {
  requestId?: string;
  userId?: string;
  sellerId?: string;
  orderId?: string;
  productId?: string;
  [key: string]: unknown;
}