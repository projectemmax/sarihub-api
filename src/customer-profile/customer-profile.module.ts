import { Module } from '@nestjs/common';
import { CustomerProfileController } from './customer-profile.controller';
import { CustomerProfileService } from './customer-profile.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerProfileController],
  providers: [CustomerProfileService, CloudinaryService],
})
export class CustomerProfileModule {}
