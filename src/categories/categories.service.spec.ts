import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('builds an active storefront category tree', async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        id: 'electronics',
        name: 'Electronics',
        slug: 'electronics',
        parentId: null,
        isActive: true,
        sortOrder: 0,
      },
      {
        id: 'audio',
        name: 'Audio',
        slug: 'electronics-audio',
        parentId: 'electronics',
        isActive: true,
        sortOrder: 0,
      },
    ]);

    await expect(service.getCategoryTree()).resolves.toEqual([
      {
        id: 'electronics',
        name: 'Electronics',
        children: [
          {
            id: 'audio',
            name: 'Audio',
            children: [],
          },
        ],
      },
    ]);
  });

  it('rejects a category parent that would create a cycle', async () => {
    prisma.category.findUnique
      .mockResolvedValueOnce({ id: 'audio', name: 'Audio' })
      .mockResolvedValueOnce({ id: 'gaming', parentId: 'audio' })
      .mockResolvedValueOnce({ id: 'audio', parentId: null });

    await expect(
      service.updateCategory('audio', { parentId: 'gaming' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
