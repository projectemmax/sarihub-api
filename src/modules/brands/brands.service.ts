import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';

@Injectable()
export class BrandsService {
    constructor(private readonly prisma: PrismaService) {}

    private generateSlug(name: string): string {
        return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }

    async findAll(query: QueryBrandDto) {
        const { search, page = 1, limit = 20 } = query;

        const where = {
            ...(query.isDeleted
                ? {
                    deletedAt: {
                    not: null,
                    },
                }
                : {
                    deletedAt: null,
            }),

            ...(query.isActive !== undefined && {
                isActive: query.isActive,
            }),

            ...(query.isVerified !== undefined && {
                isVerified: query.isVerified,
            }),

            ...(search && {
                name: {
                    contains: search,
                    mode: 'insensitive' as const,
                },
            }),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.brand.findMany({
                where,
                orderBy: {
                    name: 'asc',
                },
                include: {
                    _count: {
                        select: {
                            products: true,
                        },
                    },
                },
                skip: (page - 1) * limit,
                take: limit,
                }),
            this.prisma.brand.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string) {
        const brand = await this.prisma.brand.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });

        if (!brand || brand.deletedAt) {
            throw new NotFoundException('Brand not found');
        }

        return brand;
    }

    async create(dto: CreateBrandDto) {
        const existingBrand = await this.prisma.brand.findFirst({
            where: {
                name: {
                equals: dto.name,
                mode: 'insensitive',
                },
            },
        });

        if (existingBrand) {
            throw new ConflictException(
                `Brand "${dto.name}" already exists`,
            );
        }

        const slug = this.generateSlug(dto.name);

        const existingSlug = await this.prisma.brand.findUnique({
            where: { slug },
        });

        if (existingSlug) {
            throw new ConflictException(
                'Generated slug already exists',
            );
        }

        return this.prisma.brand.create({
            data: {
                name: dto.name,
                slug,
                description: dto.description,
                logoUrl: dto.logoUrl,
                isActive: dto.isActive ?? true,
                isVerified: dto.isVerified ?? false,
            },
        });
    }

    async update(id: string, dto: UpdateBrandDto) {
        const brand = await this.prisma.brand.findUnique({
            where: { id },
        });

        if (!brand || brand.deletedAt) {
            throw new NotFoundException('Brand not found');
        }

        let slug = brand.slug;

        if (dto.name && dto.name !== brand.name) {
            const duplicate = await this.prisma.brand.findFirst({
                where: {
                    name: {
                        equals: dto.name,
                        mode: 'insensitive',
                    },
                    deletedAt: null,
                    NOT: {
                        id,
                    },
                },
            });

            if (duplicate) {
                throw new ConflictException(
                `Brand "${dto.name}" already exists`,
                );
            }

            slug = this.generateSlug(dto.name);

            const duplicateSlug = await this.prisma.brand.findFirst({
                where: {
                    slug,
                    NOT: {
                        id,
                    },
                },
            });

            if (duplicateSlug) {
                throw new ConflictException(
                'Generated slug already exists',
                );
            }
        }

        return this.prisma.brand.update({
            where: { id },
            data: {
                ...dto,
                slug,
            },
        });
    }

    async remove(id: string) {
        const brand = await this.prisma.brand.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });

        if (!brand || brand.deletedAt) {
            throw new NotFoundException('Brand not found');
        }

        if (brand._count.products > 0) {
            throw new BadRequestException(
                'Cannot delete brand with existing products',
            );
        }

        return this.prisma.brand.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    async restore(id: string) {
        const brand = await this.prisma.brand.findUnique({
            where: { id },
        });

        if (!brand) {
            throw new NotFoundException('Brand not found');
        }

        if (!brand.deletedAt) {
            throw new BadRequestException(
            'Brand is not deleted',
            );
        }

        return this.prisma.brand.update({
            where: { id },
            data: {
            deletedAt: null,
            isActive: true,
            },
        });
    }

    
}