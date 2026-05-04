/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Post,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { SiteConfigService } from './site-config.service';
import { UpdateSiteConfigBulkDto } from './dto/update-site-config.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';

@Controller('site-config')
export class SiteConfigController {
    constructor(
        private service: SiteConfigService,
        private cloudinaryService: CloudinaryService
    ) {}

    // =========================
    // PUBLIC (STORE)
    // =========================
    @Get('public')
    getPublicConfig() {
        return this.service.getPublicConfig();
    }

    // =========================
    // ADMIN: GET ALL
    // =========================
    @Get()
    getAllConfigs() {
        return this.service.getAllConfigs();
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
        async uploadFile(@UploadedFile() file: Express.Multer.File) {

        const result = await this.cloudinaryService.uploadImage(file, {
            folder: 'site-config', // 👈 separate from products
        });

        return {
            url: result.url,
            publicId: result.publicId
        };
    }

    // =========================
    // GET SINGLE
    // =========================
    @Get(':key')
    getConfig(@Param('key') key: string) {
        return this.service.getConfig(key);
    }

    // =========================
    // UPDATE SINGLE
    // =========================
    @Patch(':key')
    updateConfig(
        @Param('key') key: string,
        @Body() body: { value: any }
    ) {
        return this.service.updateConfig(key, body.value);
    }

    // =========================
    // BULK UPDATE 🔥
    // =========================
    @Patch()
    updateBulk(@Body() body: UpdateSiteConfigBulkDto) {
        return this.service.updateBulk(body.configs);
    }
    
}