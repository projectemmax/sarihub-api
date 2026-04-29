// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.category.createMany({
    data: [
      { name: 'Alcohol & Sanitizers', isActive: true },
      { name: 'Wheelchairs', isActive: true },
      { name: 'Hospital Beds', isActive: true },
      { name: 'Diagnostic Equipment', isActive: true },
      { name: 'Medical Gloves', isActive: true },
      { name: 'Syringes & Needles', isActive: true },
      { name: 'Bandages & Gauze', isActive: true },
      { name: 'First Aid Supplies', isActive: true },
      { name: 'Face Masks', isActive: true },
    ],
    skipDuplicates: true,
  });
}

main().finally(() => prisma.$disconnect());