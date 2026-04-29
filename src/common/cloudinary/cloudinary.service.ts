/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    console.log('Cloudinary Config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
    });
  }

    async uploadImage(
        file: Express.Multer.File,
        options: {
            folder?: string;
            public_id?: string;
            overwrite?: boolean;
        } = {}
        ): Promise<{ url: string; publicId: string }> {

        const {
            folder = 'products',
            public_id,
            overwrite = false
        } = options;

        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    public_id,
                    overwrite
                },
                (error, result?: UploadApiResponse) => {
                    if (error || !result) {
                        return reject(error || new Error('Upload failed'));
                    }

                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id
                    });
                }
            );

            streamifier.createReadStream(file.buffer).pipe(stream);
        });
    }

}