/* eslint-disable prettier/prettier */
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
    AdminCategoryTreeNode,
    CategoryTreeNode
} from './interfaces/category-tree.interface';

type CategoryRecord = {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    isActive: boolean;
    sortOrder: number;
};

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) {}

    async getStorefrontCategories() {
        const categories = await this.prisma.category.findMany({
            where: {
                isActive: true,
            },
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' },
            ],
            include: {
                parent: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                _count: {
                    select: {
                        products: {
                            where: { isActive: true },
                        },
                        children: true,
                    },
                },
            },
        });

        return {
            data: categories.map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                parentId: c.parentId,
                parent: c.parent,
                isActive: c.isActive,
                sortOrder: c.sortOrder,
                productCount: c._count.products,
                childrenCount: c._count.children,
            })),
        };
    }

    async getCategoryTree(): Promise<CategoryTreeNode[]> {
        const categories = await this.prisma.category.findMany({
            where: { isActive: true },
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' },
            ],
        });

        return this.buildPublicTree(categories);
    }

    async getAdminCategoryTree(): Promise<AdminCategoryTreeNode[]> {
        const categories = await this.prisma.category.findMany({
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' },
            ],
        });

        return this.buildAdminTree(categories);
    }

    async getCategoryPath(categoryId: string): Promise<CategoryTreeNode[]> {
        const path: CategoryTreeNode[] = [];
        let cursor = await this.prisma.category.findUnique({
            where: { id: categoryId },
            select: {
                id: true,
                name: true,
                parentId: true,
            },
        });

        if (!cursor) {
            throw new NotFoundException('Category not found');
        }

        while (cursor) {
            path.unshift({
                id: cursor.id,
                name: cursor.name,
                children: [],
            });

            if (!cursor.parentId) {
                break;
            }

            cursor = await this.prisma.category.findUnique({
                where: { id: cursor.parentId },
                select: {
                    id: true,
                    name: true,
                    parentId: true,
                },
            });
        }

        return path;
    }

    // ==========================
    // ADMIN: GET
    // ==========================
    async getAdminCategories() {
        return {
            data: await this.prisma.category.findMany({
                orderBy: [
                    { sortOrder: 'asc' },
                    { name: 'asc' },
                ],
                include: {
                    parent: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                    _count: {
                        select: {
                            products: true,
                            children: true,
                        },
                    },
                },
            }),
        };
    }

    // ==========================
    // ADMIN: CREATE
    // ==========================
    async createCategory(body: CreateCategoryDto) {
        const name = body.name?.trim();

        if (!name) {
            throw new BadRequestException('Name is required');
        }

        const parentId = body.parentId || null;

        await this.assertParentExists(parentId);

        try {
            const category = await this.prisma.category.create({
                data: {
                    name,
                    slug: await this.generateUniqueSlug(name),
                    parentId,
                    isActive: body.isActive ?? true,
                    sortOrder: body.sortOrder ?? 0,
                },
            });

            return {
                message: 'Category created',
                data: category,
            };
        } catch (err) {
            this.handleCategoryWriteError(err);
        }
    }

    // ==========================
    // ADMIN: UPDATE
    // ==========================
    async updateCategory(
        id: string,
        body: UpdateCategoryDto,
    ) {
        const existing = await this.prisma.category.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException('Category not found');
        }

        if (body.parentId !== undefined) {
            await this.assertParentCanBeAssigned(id, body.parentId || null);
        }

        const name = body.name?.trim();

        try {
            const category = await this.prisma.$transaction(
                async (tx) => {

                    const updatedCategory =
                        await tx.category.update({
                            where: { id },
                            data: {
                                ...(name && {
                                    name,
                                    slug: await this.generateUniqueSlug(name, id),
                                }),
                                ...(body.parentId !== undefined && {
                                    parentId: body.parentId || null,
                                }),
                                ...(body.isActive !== undefined && {
                                    isActive: body.isActive,
                                }),
                                ...(body.sortOrder !== undefined && {
                                    sortOrder: body.sortOrder,
                                }),
                            },
                        });

                    // Cascade deactivate descendants
                    if (body.isActive === false) {

                        const descendantIds =
                            await this.getDescendantIds(id);

                        if (descendantIds.length) {

                            await tx.category.updateMany({
                                where: {
                                    id: {
                                        in: descendantIds,
                                    },
                                },
                                data: {
                                    isActive: false,
                                },
                            });
                        }
                    }

                    return updatedCategory;
                },
            );

            return {
                message: 'Category updated',
                data: category,
            };
        } catch (err) {
            this.handleCategoryWriteError(err);
        }
    }

    // ==========================
    // ADMIN: DELETE
    // ==========================
    async deleteCategory(id: string) {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        children: true,
                        products: true,
                    },
                },
            },
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        if (category._count.children > 0) {
            throw new BadRequestException(
                'Cannot delete a category that has subcategories',
            );
        }

        if (category._count.products > 0) {
            throw new BadRequestException(
                'Cannot delete a category that has products',
            );
        }

        await this.prisma.category.delete({
            where: { id },
        });
    }

    private buildPublicTree(categories: CategoryRecord[]): CategoryTreeNode[] {
        const nodes = new Map<string, CategoryTreeNode>();
        const roots: CategoryTreeNode[] = [];

        categories.forEach((category) => {
            nodes.set(category.id, {
                id: category.id,
                name: category.name,
                children: [],
            });
        });

        categories.forEach((category) => {
            const node = nodes.get(category.id);
            if (!node) return;

            if (category.parentId && nodes.has(category.parentId)) {
                nodes.get(category.parentId)?.children.push(node);
            } else if (!category.parentId) {
                roots.push(node);
            }
        });

        return roots;
    }

    private buildAdminTree(categories: CategoryRecord[]): AdminCategoryTreeNode[] {
        const nodes = new Map<string, AdminCategoryTreeNode>();
        const roots: AdminCategoryTreeNode[] = [];

        categories.forEach((category) => {
            nodes.set(category.id, {
                id: category.id,
                name: category.name,
                slug: category.slug,
                parentId: category.parentId,
                isActive: category.isActive,
                sortOrder: category.sortOrder,
                children: [],
            });
        });

        categories.forEach((category) => {
            const node = nodes.get(category.id);
            if (!node) return;

            if (category.parentId && nodes.has(category.parentId)) {
                nodes.get(category.parentId)?.children.push(node);
            } else if (!category.parentId) {
                roots.push(node);
            }
        });

        return roots;
    }

    private async assertParentExists(parentId: string | null) {
        if (!parentId) return;

        const parent = await this.prisma.category.findUnique({
            where: { id: parentId },
            select: { id: true },
        });

        if (!parent) {
            throw new BadRequestException('Parent category does not exist');
        }
    }

    private async assertParentCanBeAssigned(
        categoryId: string,
        parentId: string | null,
    ) {
        if (!parentId) return;

        if (categoryId === parentId) {
            throw new BadRequestException('A category cannot be its own parent');
        }

        let parent = await this.prisma.category.findUnique({
            where: { id: parentId },
            select: {
                id: true,
                parentId: true,
            },
        });

        if (!parent) {
            throw new BadRequestException('Parent category does not exist');
        }

        while (parent) {
            if (parent.id === categoryId) {
                throw new BadRequestException(
                    'A category cannot be moved below its own descendant',
                );
            }

            if (!parent.parentId) {
                break;
            }

            parent = await this.prisma.category.findUnique({
                where: { id: parent.parentId },
                select: {
                    id: true,
                    parentId: true,
                },
            });
        }
    }

    private generateSlug(value: string): string {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    private async generateUniqueSlug(
        name: string,
        excludeId?: string,
    ): Promise<string> {
        const baseSlug = this.generateSlug(name);
        let slug = baseSlug || 'category';
        let counter = 2;

        while (
            await this.prisma.category.findFirst({
                where: {
                    slug,
                    ...(excludeId && {
                        NOT: { id: excludeId },
                    }),
                },
                select: { id: true },
            })
        ) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return slug;
    }

    private handleCategoryWriteError(err: unknown): never {
        if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
        ) {
            throw new ConflictException('Category slug already exists');
        }

        throw err;
    }

    //============ Descendants ACTIVE and INACTIVE ==============

    private async getDescendantIds(
        categoryId: string,
    ): Promise<string[]> {

        const descendants: string[] = [];

        const collect = async (parentId: string) => {

            const children = await this.prisma.category.findMany({
                where: { parentId },
                select: { id: true },
            });

            for (const child of children) {

                descendants.push(child.id);

                await collect(child.id);
            }
        };

        await collect(categoryId);

        return descendants;
    }

}
