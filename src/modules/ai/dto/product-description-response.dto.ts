import { ApiProperty } from '@nestjs/swagger';

export class ProductDescriptionResponseDto {
  @ApiProperty({
    example:
      'Enjoy crisp wireless audio with these Bluetooth 5.3 earbuds built for everyday listening. Noise cancelling helps reduce distractions, while the 20-hour battery keeps music, calls, and videos going longer.',
  })
  description: string;

  @ApiProperty({
    example: 'Wireless earbuds with stable Bluetooth, noise cancelling, and long battery life.',
  })
  shortDescription: string;

  @ApiProperty({
    example: 'Shop wireless earbuds with Bluetooth 5.3, noise cancelling, and 20-hour battery life for clear everyday listening.',
  })
  seoDescription: string;

  @ApiProperty({
    example: ['Samsung', 'Android', '5G'],
    type: [String],
  })
  tags: string[];
}
