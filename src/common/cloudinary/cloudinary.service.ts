/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

export interface UploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        console.log('Cloudinary initialized');
    }

    async uploadImage(
        file: Express.Multer.File,
        options: {
            folder?: string;
            public_id?: string;
            overwrite?: boolean;
            transformation?: any[];
        } = {},
    ): Promise<UploadResult> {
        const {
            folder = 'general',
            public_id,
            overwrite = false,
            transformation = [
                { width: 1600, crop: 'limit' },
                { quality: 'auto' },
                { fetch_format: 'auto' },
            ],
        } = options;

        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    public_id,
                    overwrite,
                    transformation,
                },
                (error, result?: UploadApiResponse) => {
                    if (error || !result) {
                        return reject(error || new Error('Upload failed'));
                    }

                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                    });
                },
            );

            streamifier.createReadStream(file.buffer).pipe(stream);
        });
    }

    async deleteImage(publicId: string): Promise<void> {
        await cloudinary.uploader.destroy(publicId);
    }
}