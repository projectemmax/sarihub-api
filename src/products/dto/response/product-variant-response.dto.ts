import { ApiProperty } from '@nestjs/swagger';
import { MediaResponseDto } from 'src/common/dto/media-response.dto';

export class ProductVariantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  stock: number;

  @ApiProperty({
    type: [String],
    example: ['Black'],
  })
  attributes: string[];

  @ApiProperty({
    type: MediaResponseDto,
    nullable: true,
    required: false,
  })
  image?: MediaResponseDto | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}