/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';

@Controller('admin/media')
export class MediaController {
    constructor(private mediaService: MediaService) {}

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    upload(
        @UploadedFile() file: Express.Multer.File,
        @Query('folder') folder?: string,
        @Query('usage') usage?: string,
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        
        return this.mediaService.upload(file, folder, usage);
    }

    @Get()
    findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('folder') folder?: string,
        @Query('usage') usage?: string,
    ) {
        return this.mediaService.findAll(+page, +limit, folder, usage);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.mediaService.delete(id);
    }
}