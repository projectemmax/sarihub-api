import { ApiProperty } from '@nestjs/swagger';

export class ProductDescriptionResponseDto {
  @ApiProperty({
    example:
      'Enjoy crisp wireless audio with these Bluetooth 5.3 earbuds built for everyday listening. Noise cancelling helps reduce distractions, while the 20-hour battery keeps music, calls, and videos going longer.',
  })
  description: string;

  @ApiProperty({
    example: [
      'Bluetooth 5.3 for stable wireless listening',
      'Noise cancelling for fewer distractions',
      '20-hour battery for all-day use',
    ],
    type: [String],
  })
  highlights: string[];

  @ApiProperty({
    example: [
      'wireless earbuds',
      'bluetooth earbuds',
      'noise cancelling earbuds',
      'long battery earbuds',
    ],
    type: [String],
  })
  keywords: string[];
}
