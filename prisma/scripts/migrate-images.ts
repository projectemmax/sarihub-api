import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

async function migrate() {
  console.log('🚀 Starting image migration...');

  const images = await prisma.productImage.findMany();

  console.log(`Found ${images.length} images`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const img of images) {
    try {
      // ✅ Skip already migrated
      if (img.url.startsWith('http')) {
        skipped++;
        continue;
      }

      if (!img.url) {
        console.log(`⚠️ Skipping empty URL (id: ${img.id})`);
        skipped++;
        continue;
      }

      const fullUrl = `${process.env.API_BASE_URL}${img.url}`;

      console.log(`⬆️ Uploading: ${fullUrl}`);

      const uploaded = await cloudinary.uploader.upload(fullUrl, {
        folder: 'products',
      });

      await prisma.productImage.update({
        where: { id: img.id },
        data: {
          url: uploaded.secure_url,
        },
      });

      console.log(`✅ Migrated: ${img.id}`);
      migrated++;
    } catch (err) {
      console.error(`❌ Failed: ${img.id}`, err.message);
      failed++;
    }
  }

  console.log('----------------------------');
  console.log('🎯 Migration complete');
  console.log(`✅ Migrated: ${migrated}`);
  console.log(`⏭ Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
}

migrate()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());