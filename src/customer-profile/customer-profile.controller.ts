/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Get,
  Req,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
  Patch,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomerProfileService } from './customer-profile.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Customer Profile')
@ApiBearerAuth()
@Controller('customers')
export class CustomerProfileController {
    constructor(
        private readonly customerProfileService: CustomerProfileService,
        private readonly prisma: PrismaService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get('me/profile')
    @ApiOperation({ summary: 'Get my customer profile' })
    async getMyProfile(@Req() req) {
        const profile = await this.customerProfileService.getMyProfile(
            req.user.id,
        );

        return { data: profile };
    }

    @UseGuards(JwtAuthGuard)
    @Post('me/avatar')
    @UseInterceptors(
        FileInterceptor('avatar', {
            limits: {
                fileSize: 1024 * 1024, // 1MB
            },
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
                    return cb(
                        new BadRequestException('Only JPG/PNG allowed'),
                        false,
                    );
                }

                cb(null, true);
            },
        }),
    )
    async uploadAvatar(
        @UploadedFile() file: Express.Multer.File,
        @Req() req,
    ) {
        return this.customerProfileService.updateAvatar(
            req.user.id,
            file,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Patch('me/profile')
    @ApiOperation({ summary: 'Update my customer profile' })
    async updateMyProfile(
        @Req() req,
        @Body() dto: UpdateCustomerProfileDto,
    ) {
        const profile = await this.customerProfileService.updateMyProfile(
            req.user.id,
            dto,
        );

        return { data: profile };
    }

    
    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Req() req) {
        const user = await this.customerProfileService.getUserSummary(req.user.id);
        console.log('User summary:', user); // Debug log
        return {
            data: user
        };
    }

}
