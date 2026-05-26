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

    @Post()
    createCategory(
        @Body() body: {
            name: string; 
            isActive?: boolean;
            variantTemplate?: {
                attributes: string[];
            }; 
        }
    ) {
        return this.categoriesService.createCategory(body);
    }

    @Patch(':id')
    updateCategory(
        @Param('id') id: string,
        @Body() body: { 
            name?: string; 
            isActive?: boolean;
            variantTemplate?: {
                attributes: string[];
            };
        },
    ) {
        return this.categoriesService.updateCategory(id, body);
    }

    @Delete(':id')
    @HttpCode(204)
    async deleteCategory(@Param('id') id: string) {
        await this.categoriesService.softDeleteCategory(id);
    }
}