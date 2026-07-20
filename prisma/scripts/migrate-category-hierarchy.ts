import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting category hierarchy migration...');

  // --------------------------------------------------
  // STEP 1: Remove unused duplicate category
  // --------------------------------------------------

  const unusedAlcoholCategory = await prisma.category.findFirst({
    where: {
      name: 'Alcohol & Sanitizers',
    },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (
    unusedAlcoholCategory &&
    unusedAlcoholCategory._count.products === 0
  ) {
    await prisma.category.delete({
      where: {
        id: unusedAlcoholCategory.id,
      },
    });

    console.log('🗑 Deleted unused category: Alcohol & Sanitizers');
  }

  // --------------------------------------------------
  // STEP 2: Create Parent Categories
  // --------------------------------------------------

  const healthMedical = await prisma.category.upsert({
    where: {
      slug: 'health-medical',
    },
    update: {},
    create: {
      name: 'Health & Medical',
      slug: 'health-medical',
      parentId: null,
      isActive: true,
      sortOrder: 1,
    },
  });

  console.log('✅ Parent category ready: Health & Medical');

  const medicalEquipment = await prisma.category.upsert({
    where: {
      slug: 'medical-equipment',
    },
    update: {},
    create: {
      name: 'Medical Equipment',
      slug: 'medical-equipment',
      parentId: null,
      isActive: true,
      sortOrder: 2,
    },
  });

  console.log('✅ Parent category ready: Medical Equipment');

  // --------------------------------------------------
  // STEP 3: Assign Child Categories
  // --------------------------------------------------

  await prisma.category.updateMany({
    where: {
      name: {
        in: [
          'Medical Gloves',
          'Face Masks',
          'Bandages & Gauze',
          'First Aid Supplies',
          'Alcohols & Sanitizers',
          'Syringes & Needles',
        ],
      },
    },
    data: {
      parentId: healthMedical.id,
    },
  });

  console.log(
    '✅ Assigned Health & Medical child categories',
  );

  await prisma.category.updateMany({
    where: {
      name: {
        in: [
          'Diagnostic Equipment',
          'Wheelchairs',
          'Hospital Beds',
        ],
      },
    },
    data: {
      parentId: medicalEquipment.id,
    },
  });

  console.log(
    '✅ Assigned Medical Equipment child categories',
  );

  // --------------------------------------------------
  // STEP 4: Verification
  // --------------------------------------------------

  const categories = await prisma.category.findMany({
    include: {
      parent: true,
      children: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  console.log('\n📋 Category Hierarchy\n');

  categories.forEach((category) => {
    console.log(
      `${category.name} | parent: ${
        category.parent?.name ?? 'ROOT'
      } | products: ${category._count.products} | children: ${
        category.children.length
      }`,
    );
  });

  console.log('\n🎉 Category hierarchy migration completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });