import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryParentSummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;
}

export class CategorySummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional({
    type: CategoryParentSummaryResponseDto,
    nullable: true,
  })
  parent?: CategoryParentSummaryResponseDto | null;
}