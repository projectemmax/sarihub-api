-- Store selected product variants in cart/order items.
ALTER TABLE "OrderItem"
DROP CONSTRAINT IF EXISTS "OrderItem_orderId_productId_key";

ALTER TABLE "OrderItem"
ADD COLUMN "variantId" TEXT,
ADD COLUMN "variantName" TEXT,
ADD COLUMN "variantSku" TEXT,
ADD COLUMN "variantAttributes" JSONB;

CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
