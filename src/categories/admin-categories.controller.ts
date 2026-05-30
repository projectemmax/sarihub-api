/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/categories')
export class AdminCategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Get()
    @Roles(
        'ADMIN',
        'SELLER'
    )
    getCategories() {
        return this.categoriesService.getAdminCategories();
    }

    @Get('tree')
    @Roles(
        'ADMIN',
        'SELLER'
    )
    getCategoryTree() {
        return this.categoriesService.getAdminCategoryTree();
    }

    @Post()
    createCategory(
        @Body() body: CreateCategoryDto
    ) {
        return this.categoriesService.createCategory(body);
    }

    @Patch(':id')
    updateCategory(
        @Param('id') id: string,
        @Body() body: UpdateCategoryDto,
    ) {
        return this.categoriesService.updateCategory(id, body);
    }

    @Delete(':id')
    @HttpCode(204)
    async deleteCategory(@Param('id') id: string) {
        await this.categoriesService.deleteCategory(id);
    }
}
