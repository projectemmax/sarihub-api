/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, NotFoundException } from '@nestjs/common';
import { cloudinary } from 'src/common/cloudinary/cloudinary.config';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MediaService {
    constructor(
        private prisma: PrismaService,
        private cloudinary: CloudinaryService,
    ) {}

    async upload(file: Express.Multer.File, folder?: string, usage?: string) {
        const result = await this.cloudinary.uploadImage(file, {
            folder: folder || 'general',
        });

        return this.prisma.media.create({
            data: {
                url: result.url,
                publicId: result.publicId,
                filename: file.originalname,
                size: file.size,
                folder,
                usage: usage || 'general'
            },
        });
    }

    async findAll(page = 1, limit = 20, folder?: string, usage?: string) {
        return this.prisma.media.findMany({
            where: {
                ...(folder && {
                    folder: {
                        startsWith: folder,
                    },
                }),
                ...(usage && usage !== 'all' && { usage }),
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });
    }

    async delete(id: string) {
        const media = await this.prisma.media.findUnique({
            where: { id },
        });

        if (!media) throw new NotFoundException('Media not found');

        await cloudinary.uploader.destroy(media.publicId);

        return this.prisma.media.delete({
            where: { id },
        });
    }
}