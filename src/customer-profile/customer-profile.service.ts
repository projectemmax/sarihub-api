/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';


@Injectable()
export class CustomerProfileService {
    constructor(
        private prisma: PrismaService,
        private cloudinaryService: CloudinaryService,
    ) {}

    async getMyProfile(userId: string) {
        const profile = await this.prisma.customerProfile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        email: true,
                    },
                },
            },
        });

        if (!profile) {
        throw new NotFoundException('Customer profile not found');
        }

        const { user, ...profileData } = profile;

        return {
            ...profileData,
            email: user.email, // flattened email
        };
    }

    async updateAvatar(userId: string, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Avatar file is required');
        }

        const uploaded = await this.cloudinaryService.uploadImage(file, {
            folder: 'avatars/customers',
        });

        return this.prisma.customerProfile.update({
            where: { userId },
            data: {
                avatar: uploaded.url,
            },
        });
    }

    async updateMyProfile(userId: string, dto: UpdateCustomerProfileDto) {
        await this.prisma.customerProfile.update({
            where: { userId },
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                mobileNo: dto.mobileNo,
                gender: dto.gender,
                birthdate: dto.birthdate
                    ? new Date(dto.birthdate)
                    : undefined,
            },
        });

        if (dto.currentPassword && dto.newPassword) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new BadRequestException('User not found');
            }

            const passwordMatches = await bcrypt.compare(
                dto.currentPassword,
                user.password,
            );

            if (!passwordMatches) {
                throw new BadRequestException('Current password is incorrect');
            }

            const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashedPassword,
                },
            });
        }

        return this.getMyProfile(userId);
    }

    async getUserSummary(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                storeId: true,
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        mobileNo: true
                    }
                }
            }
        });

        return {
            id: user?.id,
            email: user?.email,
            role: user?.role,
            storeId: user?.storeId ?? null,
            firstName: user?.customer?.firstName ?? user?.email?.split('@')[0],
            lastName: user?.customer?.lastName ?? '',
            mobileNo: user?.customer?.mobileNo ?? '',
            avatarUrl: user?.customer?.avatar ?? null
        };
    }

}
