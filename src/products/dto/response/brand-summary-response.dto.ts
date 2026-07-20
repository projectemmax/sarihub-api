import { ApiProperty } from '@nestjs/swagger';

export class BrandSummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;
}