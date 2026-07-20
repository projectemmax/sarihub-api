import { PrismaClient, ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const marketplaceCategories = [
  {
    name: 'Electronics',
    children: [
      'Mobile Phones',
      'Computers',
      'Audio',
      'Gaming',
      'Accessories',
    ],
  },
  {
    name: 'Fashion',
    children: [
      "Men's Clothing",
      "Women's Clothing",
      'Shoes',
      'Bags',
    ],
  },
  {
    name: 'Home & Living',
    children: [
      'Furniture',
      'Kitchen',
      'Decor',
      'Storage',
    ],
  },
  {
    name: 'Beauty & Personal Care',
    children: [
      'Skincare',
      'Makeup',
      'Hair Care',
    ],
  },
  {
    name: 'Health & Wellness',
    children: [
      'Vitamins',
      'Medical Supplies',
      'Fitness',
      'Personal Care',
    ],
  },
  {
    name: 'Sports & Outdoors',
    children: [
      'Exercise Equipment',
      'Camping',
      'Cycling',
    ],
  },
  {
    name: 'Pets',
    children: [
      'Pet Food',
      'Pet Accessories',
    ],
  },
  {
    name: 'Automotive',
    children: [
      'Parts',
      'Accessories',
    ],
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seedMarketplaceCategories() {
  const categoriesBySlug = new Map<string, { id: string }>();

  for (const [parentIndex, parentCategory] of marketplaceCategories.entries()) {
    const parentSlug = slugify(parentCategory.name);

    const parent = await prisma.category.upsert({
      where: { slug: parentSlug },
      update: {
        name: parentCategory.name,
        parentId: null,
        isActive: true,
        sortOrder: parentIndex,
      },
      create: {
        name: parentCategory.name,
        slug: parentSlug,
        parentId: null,
        isActive: true,
        sortOrder: parentIndex,
      },
    });

    categoriesBySlug.set(parentSlug, parent);

    for (const [childIndex, childName] of parentCategory.children.entries()) {
      const childSlug = `${parentSlug}-${slugify(childName)}`;

      const child = await prisma.category.upsert({
        where: { slug: childSlug },
        update: {
          name: childName,
          parentId: parent.id,
          isActive: true,
          sortOrder: childIndex,
        },
        create: {
          name: childName,
          slug: childSlug,
          parentId: parent.id,
          isActive: true,
          sortOrder: childIndex,
        },
      });

      categoriesBySlug.set(childSlug, child);
    }
  }

  return categoriesBySlug;
}

async function main() {
  const categoriesBySlug = await seedMarketplaceCategories();
  const medicalSupplies = categoriesBySlug.get(
    'health-wellness-medical-supplies',
  );

  if (!medicalSupplies) {
    throw new Error('Medical Supplies category seed failed');
  }

  const products = [
    // Hospital Beds
    {
      sku: 'HB-001',
      name: '2-Crank Hospital Bed with Mattress',
      slug: '2-crank-hospital-bed-with-mattress',
      description: 'Manual 2-crank hospital bed with side rails and mattress included.',
      price: 10500,
      stock: 12,
      imageUrl: '/uploads/products/hospital-bed-1.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'HB-002',
      name: 'Semi Fowler Hospital Bed',
      slug: 'semi-fowler-hospital-bed',
      description: 'Semi Fowler adjustable hospital bed for clinics and home care.',
      price: 10667.78,
      stock: 8,
      imageUrl: '/uploads/products/hospital-bed-2.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'HB-003',
      name: 'Electric Hospital Bed 3 Function',
      slug: 'electric-hospital-bed-3-function',
      description: 'Electric hospital bed with height, backrest and leg adjustment.',
      price: 83166.35,
      stock: 3,
      imageUrl: '/uploads/products/hospital-bed-3.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'HB-004',
      name: 'AvantGuard Electric Hospital Bed',
      slug: 'avantguard-electric-hospital-bed',
      description: 'Premium electric hospital bed with anti-slip mattress platform.',
      price: 63689.44,
      stock: 2,
      imageUrl: '/uploads/products/hospital-bed-4.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'HB-005',
      name: 'Electric Hospital Bed Deluxe',
      slug: 'electric-hospital-bed-deluxe',
      description: 'Deluxe 3-function hospital bed for long-term patient care.',
      price: 60024.41,
      stock: 4,
      imageUrl: '/uploads/products/hospital-bed-5.jpg',
      categoryId: medicalSupplies.id,
    },

    // Syringes & Needles
    {
      sku: 'SN-001',
      name: 'Disposable Syringe 10ml 23G',
      slug: 'disposable-syringe-10ml-23g',
      description: 'Sterile disposable syringe 10ml with 23G needle.',
      price: 5.25,
      stock: 500,
      imageUrl: '/uploads/products/syringe-1.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'SN-002',
      name: 'Disposable Syringe 10ml 21G',
      slug: 'disposable-syringe-10ml-21g',
      description: 'Single-use syringe with 21G sterile needle.',
      price: 6,
      stock: 450,
      imageUrl: '/uploads/products/syringe-2.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'SN-003',
      name: 'BD Luer-Lok Syringe with Needle',
      slug: 'bd-luer-lok-syringe-with-needle',
      description: 'BD Luer-Lok syringe with precision glide needle.',
      price: 200,
      stock: 150,
      imageUrl: '/uploads/products/syringe-3.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'SN-004',
      name: 'Sterile Needle 23G x 1',
      slug: 'sterile-needle-23g-x-1',
      description: 'Individually packed sterile 23G x 1 inch needle.',
      price: 250,
      stock: 200,
      imageUrl: '/uploads/products/syringe-4.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'SN-005',
      name: 'PrecisionGlide Needle 18G',
      slug: 'precisionglide-needle-18g',
      description: '18G precision glide needle for medical procedures.',
      price: 1900,
      stock: 50,
      imageUrl: '/uploads/products/syringe-5.jpg',
      categoryId: medicalSupplies.id,
    },

    // Wheelchairs
    {
      sku: 'WC-001',
      name: 'Standard Adult Wheelchair',
      slug: 'standard-adult-wheelchair',
      description: 'Foldable standard wheelchair with footrest and hand brakes.',
      price: 5499,
      stock: 15,
      imageUrl: '/uploads/products/wheelchair-1.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'WC-002',
      name: 'Manual Wheelchair DW-MW03',
      slug: 'manual-wheelchair-dw-mw03',
      description: 'Manual wheelchair designed for everyday mobility.',
      price: 5710.66,
      stock: 10,
      imageUrl: '/uploads/products/wheelchair-2.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'WC-003',
      name: 'Lightweight Travel Wheelchair',
      slug: 'lightweight-travel-wheelchair',
      description: 'Portable travel wheelchair with lightweight aluminum frame.',
      price: 6449,
      stock: 6,
      imageUrl: '/uploads/products/wheelchair-3.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'WC-004',
      name: 'Manual Standard Wheelchair',
      slug: 'manual-standard-wheelchair',
      description: 'Affordable standard wheelchair for indoor and outdoor use.',
      price: 3400,
      stock: 20,
      imageUrl: '/uploads/products/wheelchair-4.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'WC-005',
      name: 'Rios Standard Wheelchair',
      slug: 'rios-standard-wheelchair',
      description: 'Heavy-duty wheelchair with padded seat and removable footrest.',
      price: 5300,
      stock: 8,
      imageUrl: '/uploads/products/wheelchair-5.jpg',
      categoryId: medicalSupplies.id,
    },

    // Alcohols & Sanitizers
    {
      sku: 'AS-001',
      name: 'Green Cross 70% Alcohol 500ml',
      slug: 'green-cross-70-alcohol-500ml',
      description: '70% ethyl alcohol with moisturizer, 500ml bottle.',
      price: 93.45,
      stock: 100,
      imageUrl: '/uploads/products/alcohol-1.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'AS-002',
      name: 'Enfant Hand Sanitizing Gel 500ml',
      slug: 'enfant-hand-sanitizing-gel-500ml',
      description: 'Hand sanitizing gel for daily hygiene protection.',
      price: 200,
      stock: 75,
      imageUrl: '/uploads/products/alcohol-2.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'AS-003',
      name: 'Skin Genie 70% Alcohol Spray',
      slug: 'skin-genie-70-alcohol-spray',
      description: 'Alcohol spray with hyaluronic formula for gentle skin care.',
      price: 220,
      stock: 60,
      imageUrl: '/uploads/products/alcohol-3.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'AS-004',
      name: 'Biogenic Ethyl Alcohol 70%',
      slug: 'biogenic-ethyl-alcohol-70',
      description: 'Biogenic 70% ethyl alcohol for home and medical use.',
      price: 38,
      stock: 120,
      imageUrl: '/uploads/products/alcohol-4.jpg',
      categoryId: medicalSupplies.id,
    },
    {
      sku: 'AS-005',
      name: 'Alcosafe 70% Alcohol Spray 250ml',
      slug: 'alcosafe-70-alcohol-spray-250ml',
      description: 'Portable 250ml alcohol spray bottle with 70% ethyl alcohol.',
      price: 94,
      stock: 90,
      imageUrl: '/uploads/products/alcohol-5.jpg',
      categoryId: medicalSupplies.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      create: {
        ...product,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
    });
  }

    const siteConfigs = [
    {
      key: 'shipping.baseFee',
      value: 100,
      isPublic: true,
    },
    {
      key: 'shipping.freeThreshold',
      value: 2000,
      isPublic: true,
    },
    {
      key: 'shipping.sameProvinceFee',
      value: 50,
      isPublic: true,
    },
    {
      key: 'shipping.otherProvinceFee',
      value: 120,
      isPublic: true,
    },
    {
      key: 'shipping.enableFreeShipping',
      value: true,
      isPublic: true,
    },
  ];

  for (const config of siteConfigs) {
    await prisma.siteConfig.upsert({
      where: { key: config.key },
      update: {
        value: config.value,
        isPublic: config.isPublic,
      },
      create: {
        key: config.key,
        value: config.value,
        isPublic: config.isPublic,
      },
    });
  }

  // Demo customer user
const customerUser = await prisma.user.upsert({
  where: { email: 'customer@test.com' },
  update: {},
  create: {
    email: 'customer2@medisupply.com',
    password: '$2b$10$z4w8x0pQF0V4l0Qf7fS3Ku4K1K3M5qI7y4vK6X8xq5cQ8q7sPj2yW', // password: 123456
    role: 'CUSTOMER',
    isActive: true,
  },
});

// Customer profile
const customerProfile = await prisma.customerProfile.upsert({
  where: { userId: customerUser.id },
  update: {},
  create: {
  userId: customerUser.id,
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  mobileNo: '09171234567',
  avatar: null,
},
});

// Default shipping address
await prisma.user.create({
  data: {
    email: 'admin@medisupply.com',
    password: await bcrypt.hash('password123', 10),
    role: 'ADMIN',
    customer: {
      create: {
        firstName: 'Admin',
        lastName: 'User',
        mobileNo: '09123456789',
      },
    },
  },
});

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
