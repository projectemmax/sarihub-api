import { Module } from '@nestjs/common';
import { SiteConfigController } from './site-config.controller';
import { SiteConfigService } from './site-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';

@Module({
  controllers: [SiteConfigController],
  providers: [SiteConfigService, PrismaService, CloudinaryService],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}
