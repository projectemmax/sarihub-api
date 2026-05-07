import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [MediaService, CloudinaryService, PrismaService],
  controllers: [MediaController]
})
export class MediaModule {}
