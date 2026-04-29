import { PrismaClient } from '@prisma/client';

const local = new PrismaClient({
  datasources: { db: { url: process.env.LOCAL_DATABASE_URL } },
});

const prod = new PrismaClient({
  datasources: { db: { url: process.env.PROD_DATABASE_URL } },
});

async function syncImages() {
  console.log('🚀 Syncing ProductImage (LOCAL → PROD)');

  const localImages = await local.productImage.findMany({
    include: { product: true }, // 🔥 REQUIRED to access slug
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const img of localImages) {
    try {
      // skip non-cloudinary / invalid URLs
      if (!img.url || !img.url.startsWith('http')) {
        skipped++;
        continue;
      }

      // 🔥 find product in prod using slug
      const prodProduct = await prod.product.findFirst({
        where: {
          slug: img.product.slug,
        },
      });

      if (!prodProduct) {
        console.log(`❌ Product not found in prod: ${img.product.slug}`);
        skipped++;
        continue;
      }

      // check if image already exists (by product + order)
      const existing = await prod.productImage.findFirst({
        where: {
          productId: prodProduct.id,
          order: img.order,
        },
      });

      if (existing) {
        await prod.productImage.update({
          where: { id: existing.id },
          data: {
            url: img.url,
            isPrimary: img.isPrimary,
          },
        });

        console.log(`🔄 Updated: ${img.product.slug} (order ${img.order})`);
        updated++;
      } else {
        await prod.productImage.create({
          data: {
            productId: prodProduct.id,
            url: img.url,
            isPrimary: img.isPrimary,
            order: img.order,
          },
        });

        console.log(`🆕 Created: ${img.product.slug} (order ${img.order})`);
        created++;
      }
    } catch (err) {
      console.error(`❌ Error processing ${img.product?.slug}`, err.message);
      skipped++;
    }
  }

  console.log('----------------------------');
  console.log(`🆕 Created: ${created}`);
  console.log(`🔄 Updated: ${updated}`);
  console.log(`⏭ Skipped: ${skipped}`);
}

syncImages().finally(() => {
  local.$disconnect();
  prod.$disconnect();
});