/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProductsService } from './products.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { GetProductsDto } from './dto/get-products.dto';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SELLER')
@ApiBearerAuth()
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

    // GET /api/admin/products
    @Get()
    getProducts(@Query() query: GetProductsDto, @CurrentUser() user: any) {
        console.log(user);
        return this.productsService.getAdminProducts(query, user);
    }

    @Patch('bulk-status')
    bulkUpdateStatus(@Body() body: BulkUpdateStatusDto) {
        return this.productsService.bulkUpdateStatus(body);
    }

    // GET /api/admin/products/:id
    @Get(':id')
    getProductById(@Param('id') id: string, @CurrentUser() user: any) {
        return this.productsService.getProductById(id, user);
    }

    // POST /api/admin/products
    @Post()
    createProduct(@Body() body: CreateProductDto, @CurrentUser() user: any) {
        return this.productsService.createProduct(body, user);
    }

    // PATCH /api/admin/products/:id
    @Put(':id')
    updateProduct(
        @Param('id') id: string,
        @Body() body: UpdateProductDto,
        @CurrentUser() user: any
    ) {
        return this.productsService.updateProduct(id, body, user);
    }

    // DELETE /api/admin/products/:id
    @Delete(':id')
    @HttpCode(204)
    async deleteProduct(@Param('id') id: string): Promise<void> {
        await this.productsService.softDeleteProduct(id);
    }

    // POST /api/admin/products/:id/image
    @Post(':id/image')
    @UseInterceptors(FileInterceptor('image')) // no diskStorage
    async uploadImage(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.productsService.uploadProductImage(id, file);
    }

    // uploadImage(
    // @Param('id') id: string,
    // @UploadedFile() file: Express.Multer.File,
    // ) {
    //     return this.productsService.uploadProductImage(id, file);
    // }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadTemp(
        @UploadedFile() file: Express.Multer.File
    ) {

        const result = await this.cloudinaryService.uploadImage(file, {
            folder: 'products',
        });

        return {
            url: result.url,
            publicId: result.publicId
        };
    }
    
    // uploadTemp(@UploadedFile() file: Express.Multer.File) {
    //     return {
    //         url: `/uploads/products/${file.filename}`
    //     };
    // }


    // PATCH /api/admin/products/:id/restore
    @Patch(':id/restore')
    @HttpCode(204)
    async restoreProduct(@Param('id') id: string): Promise<void> {
        await this.productsService.restoreProduct(id);
    }

    // DELETE /api/admin/products/:id/permanent
    @Delete(':id/permanent')
    @HttpCode(204)
    async hardDeleteProduct(@Param('id') id: string): Promise<void> {
        await this.productsService.hardDeleteProduct(id);
    }

    @Post(':id/variants/:variantId/upload')
    @UseInterceptors(FileInterceptor('file'))
    uploadVariantImage(
        @Param('id') productId: string,
        @Param('variantId') variantId: string,
        @UploadedFile() file: Express.Multer.File
    ) {
        return this.productsService.uploadVariantImage(
            productId,
            variantId,
            file
        );
    }

}