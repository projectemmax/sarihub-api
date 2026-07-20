import { ApiProperty } from '@nestjs/swagger';

export class MediaResponseDto {
  @ApiProperty({
    description: 'Cloudinary public ID',
    example: 'products/aebct4odts4hwelshmkn',
  })
  publicId: string;

  @ApiProperty({
    description: 'Resolved Cloudinary URL',
    example:
      'https://res.cloudinary.com/your-cloud/image/upload/v123/products/aebct4odts4hwelshmkn.jpg',
  })
  url: string;
}