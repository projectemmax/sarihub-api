import { ApiProperty } from '@nestjs/swagger';
import { MediaResponseDto } from 'src/common/dto/media-response.dto';

export class ProductImageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty({
    type: MediaResponseDto,
  })
  media: MediaResponseDto;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;
}