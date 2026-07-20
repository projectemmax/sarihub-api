import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding marketplace root categories...');

  const categories = [
    {
      name: 'Electronics',
      slug: 'electronics',
      sortOrder: 10,
    },
    {
      name: 'Fashion',
      slug: 'fashion',
      sortOrder: 20,
    },
    {
      name: 'Home & Living',
      slug: 'home-living',
      sortOrder: 30,
    },
    {
      name: 'Beauty & Personal Care',
      slug: 'beauty-personal-care',
      sortOrder: 40,
    },
    {
      name: 'Sports & Outdoors',
      slug: 'sports-outdoors',
      sortOrder: 50,
    },
    {
      name: 'Pets',
      slug: 'pets',
      sortOrder: 60,
    },
    {
      name: 'Automotive',
      slug: 'automotive',
      sortOrder: 70,
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        slug: category.slug,
      },
      update: {},
      create: {
        name: category.name,
        slug: category.slug,
        parentId: null,
        isActive: true,
        sortOrder: category.sortOrder,
      },
    });

    console.log(`✅ ${category.name}`);
  }

  console.log('🎉 Marketplace categories seeded.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });