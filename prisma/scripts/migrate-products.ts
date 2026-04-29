import { Prisma, PrismaClient } from '@prisma/client';


const local = new PrismaClient({
  datasources: { db: { url: process.env.LOCAL_DATABASE_URL } },
});

const prod = new PrismaClient({
  datasources: { db: { url: process.env.PROD_DATABASE_URL } },
});

async function migrateProducts() {
  console.log('🚀 Migrating Products + Images (LOCAL → PROD)');

  const localProducts = await local.product.findMany({
    include: {
      images: true,
      category: true,
    },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const product of localProducts) {
    try {
      // 🔥 find category in prod (by name)
      const prodCategory = await prod.category.findFirst({
        where: {
          name: product.category?.name,
        },
      });

      if (!prodCategory) {
        console.log(`❌ Category not found: ${product.category?.name}`);
        skipped++;
        continue;
      }

      // 🔥 check if product already exists (by slug)
      const existing = await prod.product.findFirst({
        where: {
          slug: product.slug,
        },
      });

      let prodProduct;

      if (existing) {
        // 🔄 update existing product
        prodProduct = await prod.product.update({
          where: { id: existing.id },
          data: {
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            sku: product.sku,
            isActive: product.isActive,
            isFeatured: product.isFeatured,
            categoryId: prodCategory.id,
            variantOptions: product.variantOptions ?? Prisma.JsonNull,
          },
        });

        console.log(`🔄 Updated product: ${product.slug}`);
        updated++;
      } else {
        // 🆕 create new product
        prodProduct = await prod.product.create({
          data: {
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            sku: product.sku,
            isActive: product.isActive,
            isFeatured: product.isFeatured,
            slug: product.slug,
            categoryId: prodCategory.id,
            variantOptions: product.variantOptions ?? Prisma.JsonNull,
          },
        });

        console.log(`🆕 Created product: ${product.slug}`);
        created++;
      }

      // 🔥 sync images
      for (const img of product.images) {
        if (!img.url.startsWith('http')) continue;

        const existingImage = await prod.productImage.findFirst({
          where: {
            productId: prodProduct.id,
            order: img.order,
          },
        });

        if (existingImage) {
          await prod.productImage.update({
            where: { id: existingImage.id },
            data: {
              url: img.url,
              isPrimary: img.isPrimary,
            },
          });
        } else {
          await prod.productImage.create({
            data: {
              productId: prodProduct.id,
              url: img.url,
              isPrimary: img.isPrimary,
              order: img.order,
            },
          });
        }
      }

    } catch (err) {
      console.error(`❌ Error on ${product.slug}`, err.message);
      skipped++;
    }
  }

  console.log('----------------------------');
  console.log(`🆕 Created: ${created}`);
  console.log(`🔄 Updated: ${updated}`);
  console.log(`⏭ Skipped: ${skipped}`);
}

async function syncVariants() {
  console.log('🚀 Syncing ProductVariant (LOCAL → PROD)');

  const localVariants = await local.productVariant.findMany({
    include: { product: true },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const variant of localVariants) {
    try {
      // 🔥 find product in prod using slug
      const prodProduct = await prod.product.findFirst({
        where: {
          slug: variant.product.slug,
        },
      });

      if (!prodProduct) {
        console.log(`❌ Product not found: ${variant.product.slug}`);
        skipped++;
        continue;
      }

      // 🔥 check existing variant by SKU (best unique key)
      const existing = await prod.productVariant.findFirst({
        where: {
          sku: variant.sku,
        },
      });

      if (existing) {
        await prod.productVariant.update({
          where: { id: existing.id },
          data: {
            price: variant.price,
            stock: variant.stock,
            attributes: variant.attributes ?? undefined,
            image: variant.image, // ⚠️ still local path? optional fix later
            productId: prodProduct.id,
          },
        });

        console.log(`🔄 Updated variant: ${variant.sku}`);
        updated++;
      } else {
        await prod.productVariant.create({
          data: {
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
            attributes: variant.attributes ?? Prisma.JsonNull,
            image: variant.image,
            productId: prodProduct.id,
          },
        });

        console.log(`🆕 Created variant: ${variant.sku}`);
        created++;
      }
    } catch (err) {
      console.error(`❌ Error variant ${variant.sku}`, err.message);
      skipped++;
    }
  }

  console.log('----------------------------');
  console.log(`🆕 Created: ${created}`);
  console.log(`🔄 Updated: ${updated}`);
  console.log(`⏭ Skipped: ${skipped}`);
}

async function main() {
  await migrateProducts();
  await syncVariants(); // 🔥 THIS IS MISSING
}

main().finally(() => {
  local.$disconnect();
  prod.$disconnect();
});